import { Module } from '@nestjs/common';
import { VideoController } from './video.controller.js';
import { VideoService } from './video.service.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [AiModule],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
