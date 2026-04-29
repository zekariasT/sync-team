import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { PDFParse } from 'pdf-parse';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class KbService {
  private readonly logger = new Logger(KbService.name);
  private pinecone: Pinecone;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly eventEmitter: EventEmitter2,
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

  private async checkTeamPermission(teamId: string, requesterId: string, allowedRoles: string[]) {
    if (!requesterId) throw new ForbiddenException('Unauthorized');
    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: requesterId, teamId } }
    });
    const anyAdmin = await this.prisma.teamMember.findFirst({
      where: { userId: requesterId, role: 'ADMIN' }
    });
    
    if (anyAdmin) return true;
    if (!member) throw new ForbiddenException('You do not belong to this team');
    if (!allowedRoles.includes(member.role)) throw new ForbiddenException('Insufficient permissions');
    return true;
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
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
    return this.prisma.document.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deleteDocument(teamId: string, documentId: string, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD']);
    
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.teamId !== teamId) throw new NotFoundException('Document not found');

    await this.prisma.document.delete({ where: { id: documentId } });
    
    this.logger.log(`Document ${documentId} deleted from relational DB. Emitting sync event.`);
    this.eventEmitter.emit('document.deleted', { documentId, teamId });
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

    this.logger.log(`Document ${documentId} updated in relational DB. Emitting sync event.`);
    this.eventEmitter.emit('document.updated', { document: updatedDoc, text });
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

    this.logger.log(`Document ${document.id} saved to relational DB. Emitting sync event.`);
    
    // Asynchronous background task constraint
    this.eventEmitter.emit('document.updated', { document, text });

    return document;
  }

  @OnEvent('document.updated', { async: true })
  async handleDocumentSync(payload: { document: any, text: string }) {
    const { document, text } = payload;
    if (!process.env.PINECONE_API_KEY) return;

    this.logger.log(`Background Sync: Embedding and chunking document ${document.id}...`);
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Atomic Sync step 1: Extinguish any existing ghost chunks for this document
      try {
         await index.deleteMany({ filter: { documentId: document.id } } as any);
      } catch (e) {
         this.logger.log(`No existing chunks found or metadata deletion skipped: ${e}`);
      }

      // Chunk text (approx 512 tokens -> ~2000 chars)
      const chunks = this.chunkText(text, 2000);
      const vectors: any[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        try {
          // @ts-ignore
          const embeddingResponse = await this.aiService['ai'].models.embedContent({
             model: 'gemini-embedding-001',
             contents: chunkContent,
          });
          
          const values = embeddingResponse.embeddings?.[0]?.values;
          if (values) {
              vectors.push({
                 id: `${document.id}#${i}`,
                 values,
                 metadata: {
                     teamId: document.teamId,
                     documentId: document.id,
                     title: document.title,
                     text: chunkContent
                 }
              });
          }
        } catch (e: any) {
          this.logger.error(`Failed to embed chunk ${i}: ${e.message}`);
        }
      }

      if (vectors.length > 0) {
          await index.upsert({
              records: vectors
          });
          this.logger.log(`Background Sync: Successfully locked ${vectors.length} chunks for ${document.id}`);
      }
    } catch (e: any) {
        this.logger.error(`Background Sync Error: Failed to embed/upsert vector for ${document.id}: ${e.message}`);
    }
  }

  @OnEvent('document.deleted', { async: true })
  async handleDocumentDelete(payload: { documentId: string, teamId: string }) {
    const { documentId } = payload;
    if (!process.env.PINECONE_API_KEY) return;

    this.logger.log(`Background Sync: Extinguishing all chunks for vector ${documentId}...`);
    try {
        const index = this.pinecone.index(this.indexName);
        await index.deleteMany({ filter: { documentId } } as any);
        this.logger.log(`Background Sync: Successfully destroyed all chunks for vector ${documentId}`);
    } catch (e: any) {
        this.logger.error(`Background Sync Error: Failed to drop chunks for vector ${documentId}: ${e.message}`);
    }
  }

  async askKnowledgeBase(teamId: string, query: string, requesterId: string): Promise<string> {
     await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
     if (!process.env.PINECONE_API_KEY) {
         return "Pinecone is not configured. Please set PINECONE_API_KEY to search the Knowledge Base.";
     }

     try {
         // @ts-ignore
         const embeddingResponse = await this.aiService['ai'].models.embedContent({
             model: 'gemini-embedding-001',
             contents: query,
         });
         const queryEmbedding = embeddingResponse.embeddings?.[0]?.values;
         if (!queryEmbedding) throw new Error("Failed to embed query.");

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

         // @ts-ignore
         const answerResponse = await this.aiService['ai'].models.generateContent({
             model: 'gemini-2.5-flash-lite',
             contents: prompt,
         });

         return answerResponse.text || "Failed to generate answer.";
         
     } catch (e: any) {
         this.logger.error(`RAG query failed: ${e.message}`);
         return "I encountered an error while searching the Knowledge Base.";
     }
  }

  private chunkText(text: string, chunkSize: number, chunkOverlap: number = 200): string[] {
    const chunks: string[] = [];
    let cur = 0;
    while (cur < text.length) {
      const chunk = text.slice(cur, cur + chunkSize);
      chunks.push(chunk);
      cur += (chunkSize - chunkOverlap);
      if (chunkSize <= chunkOverlap) break; 
      if (cur + chunkOverlap >= text.length) break;
    }
    return chunks;
  }
}
