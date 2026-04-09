import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { Pinecone } from '@pinecone-database/pinecone';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class KbService {
  private readonly logger = new Logger(KbService.name);
  private pinecone: Pinecone;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
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

  async uploadDocument(
    teamId: string,
    uploaderId: string,
    file: Express.Multer.File,
    requesterId: string
  ) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);

    const docCount = await this.prisma.document.count({ where: { teamId } });
    if (docCount >= 3) {
       throw new ForbiddenException('For the free demo, each team is limited to a maximum of 3 indexed documents.');
    }

    let text = '';
    
    // Parse depending on mime type, defaults to pdf
    if (file.mimetype === 'application/pdf') {
      const pdf = new PDFParse({ data: file.buffer });
      const result = await pdf.getText();
      text = result.text;
      await pdf.destroy();
    } else {
      text = file.buffer.toString('utf-8');
    }

    // Save to database
    const document = await this.prisma.document.create({
      data: {
        teamId,
        uploaderId,
        title: file.originalname,
        fileUrl: `/uploads/${file.originalname}`, // Placeholder for actual S3/Cloudinary url
      },
    });

    // Chunk text (approx 512 tokens -> ~2000 chars)
    const chunks = this.chunkText(text, 2000);
    this.logger.log(`Parsed ${file.originalname} into ${chunks.length} chunks`);

    if (!process.env.PINECONE_API_KEY) {
        this.logger.warn('No PINECONE_API_KEY. Skipping embedding upsert.');
        return document;
    }

    const index = this.pinecone.index(this.indexName);
    const vectors: any[] = [];

    // Process in batches
    for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        try {
            // @ts-ignore - reaching into the google gemini instance
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
                       teamId,
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

    this.logger.log(`Final vectors to upsert: ${vectors.length}`);
    if (vectors.length > 0) {
        // Updated to use records object format for modern Pinecone SDK
        await index.upsert({
            records: vectors
        });
        this.logger.log(`Upserted ${vectors.length} vectors for document ${document.id}`);
    }

    return document;
  }

  async askKnowledgeBase(teamId: string, query: string, requesterId: string): Promise<string> {
     await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
     if (!process.env.PINECONE_API_KEY) {
         return "Pinecone is not configured. Please set PINECONE_API_KEY to search the Knowledge Base.";
     }

     try {
         // 1. Embed query
         // @ts-ignore
         const embeddingResponse = await this.aiService['ai'].models.embedContent({
             model: 'gemini-embedding-001',
             contents: query,
         });
         const queryEmbedding = embeddingResponse.embeddings?.[0]?.values;
         if (!queryEmbedding) throw new Error("Failed to embed query.");

         // 2. Search Pinecone
         const index = this.pinecone.index(this.indexName);
         const searchResults = await index.query({
             vector: queryEmbedding,
             topK: 10,
             includeMetadata: true,
             filter: {
                 teamId: { $eq: teamId } // Ensure we only search within the specific team's documents
             }
         });

         if (!searchResults.matches || searchResults.matches.length === 0) {
             return "I couldn't find any relevant information in your team's Knowledge Base to answer that.";
         }

         // 3. Construct context
         const contextChunks = searchResults.matches.map(m => {
             const meta = m.metadata as any;
             return `Source Document: ${meta.title}\nContent: ${meta.text}`;
         }).join('\\n\\n');

         // 4. Generate answer using Gemini
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

  // private chunkText(text: string, chunkSize: number): string[] {
  //   const chunks: string[] = [];
  //   let cur = 0;
  //   while (cur < text.length) {
  //       chunks.push(text.slice(cur, cur + chunkSize));
  //       cur += chunkSize;
  //   }
  //   return chunks;
  // }

  private chunkText(text: string, chunkSize: number, chunkOverlap: number = 200): string[] {
  const chunks: string[] = [];
  let cur = 0;

  // We loop until we hit the end of the text
  while (cur < text.length) {
    // 1. Grab the chunk
    const chunk = text.slice(cur, cur + chunkSize);
    chunks.push(chunk);

    // 2. MOVE THE CURSOR: 
    // Instead of jumping by the full chunkSize, we jump by (chunkSize - overlap).
    // This ensures the next chunk "re-reads" the last 200 characters of the current one.
    cur += (chunkSize - chunkOverlap);

    // Safety check: if the overlap is bigger than the chunk, we'd loop forever.
    if (chunkSize <= chunkOverlap) break; 
    
    // If the remaining text is smaller than our overlap, we're done.
    if (cur + chunkOverlap >= text.length) break;
  }

  return chunks;
}

}

