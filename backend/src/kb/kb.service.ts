import { Injectable, Inject, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { EVENTS_CLIENT } from '../messaging/messaging.module.js';
import { DOCUMENT_UPLOADED, DOCUMENT_DELETED } from '../messaging/contracts.js';

@Injectable()
export class KbService {
  private readonly logger = new Logger(KbService.name);
  private pinecone: Pinecone;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    @Inject(EVENTS_CLIENT) private readonly events: ClientProxy,
  ) {
    if (process.env.PINECONE_API_KEY) {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      });
    } else {
      this.pinecone = null as any;
    }
  }

  get indexName() {
    return process.env.PINECONE_INDEX_NAME || 'syncpoint';
  }

  private async checkTeamPermission(teamId: string, requesterId: string, allowedRoles: string[]): Promise<{ isAdmin: boolean }> {
    if (!requesterId) throw new ForbiddenException('Unauthorized');
    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: requesterId, teamId } }
    });
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId }, select: { isRoot: true }
    });
    if (requester?.isRoot) return { isAdmin: true }; // global root: account-level superuser
    const anyAdmin = await this.prisma.teamMember.findFirst({
      where: { userId: requesterId, role: 'ADMIN' }
    });

    if (anyAdmin) return { isAdmin: true };
    if (!member) throw new ForbiddenException('You do not belong to this team');
    if (!allowedRoles.includes(member.role)) throw new ForbiddenException('Insufficient permissions');
    return { isAdmin: false };
  }

  private async ensureIndex() {
    if (!process.env.PINECONE_API_KEY) {
      this.logger.warn('PINECONE_API_KEY not set, skipping index check');
      return;
    }
    const existingIndices = await this.pinecone.listIndexes();
    const exists = existingIndices.indexes?.some(i => i.name === this.indexName);
    
    if (exists) {
      this.logger.log(`Pinecone index "${this.indexName}" already exists.`);
    } else {
      this.logger.log(`Creating Pinecone index: ${this.indexName}`);
      await this.pinecone.createIndex({
        name: this.indexName,
        dimension: 768, // gemini-embedding-001 dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      }); 
    }
  }

  async onModuleInit() {
    try {
      await this.ensureIndex();
    } catch (e: any) {
      this.logger.error('Failed to initialize Pinecone:', e.message);
    }
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    let text = '';
    if (file.mimetype === 'application/pdf') {
      // Lazy-load pdf-parse: it pulls in pdfjs, which evaluates browser globals
      // (DOMMatrix) at module load and would crash the whole app on boot under
      // older Node. Importing it only when a PDF is actually parsed keeps boot safe.
      const { PDFParse } = await import('pdf-parse');
      const pdf = new PDFParse({ data: file.buffer });
      const result = await pdf.getText();
      text = result.text;
      await pdf.destroy();
    } else {
      text = file.buffer.toString('utf-8');
    }
    // Return full text, chunking will handle the rest
    return text;
  }

  async getDocuments(teamId: string, requesterId: string) {
    const { isAdmin } = await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);

    return this.prisma.document.findMany({
      where: isAdmin ? {} : { teamId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteDocument(teamId: string, documentId: string, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD']);
    
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.teamId !== teamId) throw new NotFoundException('Document not found');

    await this.prisma.document.delete({ where: { id: documentId } });
    
    this.logger.log(`Document ${documentId} deleted from relational DB. Dispatching de-index job.`);
    this.events.emit(DOCUMENT_DELETED, { documentId, teamId });
    return { success: true };
  }

  async updateDocument(teamId: string, documentId: string, file: Express.Multer.File, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD']);
    
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.teamId !== teamId) throw new NotFoundException('Document not found');

    const updatedDoc = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        title: file.originalname,
        fileUrl: `/uploads/${file.originalname}`,
      }
    });

    const text = await this.extractText(file);

    this.logger.log(`Document ${documentId} updated in relational DB. Dispatching re-index job.`);
    this.events.emit(DOCUMENT_UPLOADED, { document: updatedDoc, text });
    return updatedDoc;
  }

  async uploadDocument(
    teamId: string,
    uploaderId: string,
    file: Express.Multer.File,
    requesterId: string
  ) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);

    const docCount = await this.prisma.document.count({ where: { teamId } });
    if (docCount >= 5) {
       throw new ForbiddenException('For the free demo, each team is limited to a maximum of 5 indexed documents.');
    }

    const text = await this.extractText(file);

    const document = await this.prisma.document.create({
      data: {
        teamId,
        uploaderId,
        title: file.originalname,
        fileUrl: `/uploads/${file.originalname}`,
      },
    });

    this.logger.log(`Document ${document.id} saved to relational DB. Dispatching index job to ai-worker.`);

    // Hand the heavy work (chunk → embed → upsert) to the ai-worker over RabbitMQ.
    // Returns immediately; the browser is notified over WebSocket when indexing completes.
    this.events.emit(DOCUMENT_UPLOADED, { document, text });

    return document;
  }

  // NOTE: The chunk → embed → upsert WRITE path (formerly @OnEvent handlers here)
  // now lives in the standalone ai-worker service, driven by RabbitMQ events.
  // KbService retains only the synchronous READ path (askKnowledgeBase) below.

  async askKnowledgeBase(teamId: string, query: string, requesterId: string): Promise<string> {
     await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
     if (!process.env.PINECONE_API_KEY) {
         return "Pinecone is not configured. Please set PINECONE_API_KEY to search the Knowledge Base.";
     }
     if (!process.env.GEMINI_API_KEY) {
         return "Gemini is not configured. Please set GEMINI_API_KEY to search the Knowledge Base.";
     }

     try {
         let queryEmbedding: number[] | undefined;
         try {
             // @ts-ignore
             const embeddingResponse = await this.aiService['ai'].models.embedContent({
                 model: 'gemini-embedding-001',
                 contents: query,
                 // Must match the worker's write-path dims (index is 768, not the 3072 default).
                 config: { outputDimensionality: 768 },
             });
             queryEmbedding = embeddingResponse.embeddings?.[0]?.values;
         } catch (embedErr: any) {
             this.logger.error('RAG embedding call failed', embedErr?.stack || embedErr);
             return "I couldn't embed your question (the embedding service rejected the request). Check the Gemini API key and try again.";
         }
         if (!queryEmbedding) {
             this.logger.error('RAG embedding returned no vector');
             return "I couldn't embed your question — the embedding service returned no result. Try again shortly.";
         }

         const index = this.pinecone.index(this.indexName);
         const searchResults = await index.query({
             vector: queryEmbedding,
             topK: 10,
             includeMetadata: true,
             filter: {
                 teamId: { $eq: teamId }
             }
         });

         if (!searchResults.matches || searchResults.matches.length === 0) {
             return "I couldn't find any relevant information in your team's Knowledge Base to answer that.";
         }

         const contextChunks = searchResults.matches.map(m => {
             const meta = m.metadata as any;
             return `Source Document: ${meta.title}\nContent: ${meta.text}`;
         }).join('\n\n');

        const prompt = `You are an AI assistant for a team. Answer the user's question using the provided Knowledge Base context.
        
        ## Context
        ${contextChunks}

        ## Instructions
        1. Use the provided context to answer the question. 
        2. If the answer isn't explicitly stated but can be logically inferred (e.g., a "chair" being part of a "home-office stipend"), provide the answer based on that inference.
        3. If the context is completely irrelevant to the question, state that you don't know.
         
         ## Question
         ${query}
         
         Answer concisely and clearly.`;

         let answerResponse: any;
         try {
             // @ts-ignore
             answerResponse = await this.aiService['ai'].models.generateContent({
                 model: 'gemini-2.5-flash-lite',
                 contents: prompt,
             });
         } catch (genErr: any) {
             this.logger.error('RAG generation call failed', genErr?.stack || genErr);
             return "I found relevant context but the answer-generation service failed. Check the Gemini API key and try again.";
         }

         return answerResponse.text || "Failed to generate answer.";

     } catch (e: any) {
         // Anything not caught above (e.g. the Pinecone query) — log the full
         // error so the real cause is visible in the server logs, not just the
         // generic message the user sees.
         this.logger.error('RAG query failed', e?.stack || e);
         return "I encountered an error while searching the Knowledge Base.";
     }
  }
}
