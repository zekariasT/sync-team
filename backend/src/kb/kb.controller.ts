import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KbService } from './kb.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';

@Controller('teams/:teamId/kb')
@UseGuards(ClerkAuthGuard)
export class KbController {
  constructor(private readonly kbService: KbService) {}

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('teamId') teamId: string,
    @Body('uploaderId') uploaderId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.kbService.uploadDocument(teamId, uploaderId, file);
  }

  @Post('query')
  async queryKnowledgeBase(
    @Param('teamId') teamId: string,
    @Body('query') query: string,
  ) {
    const answer = await this.kbService.askKnowledgeBase(teamId, query);
    return { answer };
  }
}
