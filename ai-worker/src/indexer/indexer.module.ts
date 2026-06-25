import { Module } from '@nestjs/common';
import { IndexerController } from './indexer.controller.js';
import { IndexerService } from './indexer.service.js';
import { EmbeddingsService } from '../embeddings/embeddings.service.js';
import { RedisPublisher } from '../redis/redis.publisher.js';

@Module({
  controllers: [IndexerController],
  providers: [IndexerService, EmbeddingsService, RedisPublisher],
})
export class IndexerModule {}
