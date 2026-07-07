import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

/**
 * Thin wrapper around Gemini embeddings. Lives in the worker because embedding
 * is part of the async write path; core-api keeps its own copy for query-time embeds.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  /** Returns the embedding vector for a chunk of text, or null on failure. */
  async embed(text: string): Promise<number[] | null> {
    try {
      const response = await this.ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        // gemini-embedding-001 outputs 3072 dims by default; our Pinecone index
        // is 768. Truncate via MRL so write- and read-path dims match the index.
        config: { outputDimensionality: 768 },
      });
      return response.embeddings?.[0]?.values ?? null;
    } catch (e: any) {
      this.logger.error(`Embedding failed: ${e.message}`);
      return null;
    }
  }
}
