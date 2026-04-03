import { Module } from '@nestjs/common';
import { KbController } from './kb.controller.js';
import { KbService } from './kb.service.js';
import { PrismaService } from '../prisma.service.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AiModule],
  controllers: [KbController],
  providers: [KbService, PrismaService],
})
export class KbModule {}
