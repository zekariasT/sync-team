import { Module } from '@nestjs/common';
import { IndexerModule } from './indexer/indexer.module.js';

@Module({
  imports: [IndexerModule],
})
export class AppModule {}
