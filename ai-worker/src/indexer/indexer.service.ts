import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { RedisPublisher } from '../redis/redis.publisher.js';
import { DocumentUploadedEvent, DocumentDeletedEvent } from '../messaging/contracts.js';

/**
 * Owns the vector-store WRITE path: chunk → embed → upsert into Pinecone.
 * This is the heavy, bursty work that was previously an in-process @OnEvent
 * handler inside the monolith; it now runs in its own scalable service.
 */
@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private readonly pinecone: Pinecone | null = process.env.PINECONE_API_KEY
    ? new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
    : null;

  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly redis: RedisPublisher,
  ) {}

  private get indexName(): string {
    return process.env.PINECONE_INDEX_NAME || 'syncpoint';
  }

  /** Make sure the index exists before the first upsert (idempotent). */
  async onModuleInit(): Promise<void> {
    if (!this.pinecone) {
      this.logger.warn('PINECONE_API_KEY not set — worker will no-op on events.');
      return;
    }
    try {
      const existing = await this.pinecone.listIndexes();
      if (existing.indexes?.some((i) => i.name === this.indexName)) {
        this.logger.log(`Pinecone index "${this.indexName}" is ready.`);
        return;
      }
      this.logger.log(`Creating Pinecone index "${this.indexName}"...`);
      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: 768, // gemini-embedding-001
        metric: 'cosine',
        spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
      });
    } catch (e: any) {
      this.logger.error(`Failed to ensure Pinecone index: ${e.message}`);
    }
  }

  /** Handle a document.uploaded event end-to-end. */
  async index({ document, text }: DocumentUploadedEvent): Promise<void> {
    if (!this.pinecone) return;
    const index = this.pinecone.index(this.indexName);

    // Idempotency: clear any prior chunks for this document before re-indexing.
    await this.purgeDocument(index, document.id);

    const chunks = this.chunkText(text, 2000);
    const vectors: any[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const values = await this.embeddings.embed(chunks[i]);
      if (values) {
        vectors.push({
          id: `${document.id}#${i}`,
          values,
          metadata: {
            teamId: document.teamId,
            documentId: document.id,
            title: document.title,
            text: chunks[i],
          },
        });
      }
    }

    if (vectors.length > 0) {
      await index.upsert({ records: vectors });
    }
    this.logger.log(`Indexed ${vectors.length} chunk(s) for document ${document.id}`);

    // Tell the user's team, live, that their document is searchable.
    await this.redis.publish({
      type: 'document.indexed',
      teamId: document.teamId,
      documentId: document.id,
      title: document.title,
      chunks: vectors.length,
    });
  }

  /** Handle a document.deleted event — purge vectors and notify. */
  async remove({ documentId, teamId }: DocumentDeletedEvent): Promise<void> {
    if (!this.pinecone) return;
    const index = this.pinecone.index(this.indexName);
    await this.purgeDocument(index, documentId);
    this.logger.log(`Removed all chunks for document ${documentId}`);

    await this.redis.publish({ type: 'document.removed', teamId, documentId });
  }

  /**
   * Delete every chunk for a document. Serverless indexes don't support
   * metadata-filtered deletes, so we list this doc's vector IDs by their
   * `${documentId}#` prefix and delete them explicitly. A 404 means the
   * namespace was never created (nothing indexed yet) — safe to ignore.
   */
  private async purgeDocument(index: any, documentId: string): Promise<void> {
    try {
      const ids: string[] = [];
      let paginationToken: string | undefined;
      do {
        const page = await index.listPaginated({
          prefix: `${documentId}#`,
          paginationToken,
        });
        for (const v of page.vectors ?? []) {
          if (v.id) ids.push(v.id);
        }
        paginationToken = page.pagination?.next;
      } while (paginationToken);

      if (ids.length > 0) {
        await index.deleteMany(ids);
      }
    } catch (e: any) {
      if (e?.status === 404 || /404/.test(e?.message ?? '')) return; // namespace not created yet
      throw e;
    }
  }

  private chunkText(text: string, chunkSize: number, chunkOverlap = 200): string[] {
    const chunks: string[] = [];
    let cur = 0;
    while (cur < text.length) {
      chunks.push(text.slice(cur, cur + chunkSize));
      cur += chunkSize - chunkOverlap;
      if (chunkSize <= chunkOverlap) break;
      if (cur + chunkOverlap >= text.length) break;
    }
    return chunks;
  }
}
