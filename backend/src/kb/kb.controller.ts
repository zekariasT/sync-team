import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFile, UseGuards, Headers } from '@nestjs/common';
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
    @Headers('x-user-id') requesterId: string
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.kbService.uploadDocument(teamId, uploaderId, file, requesterId);
  }

  @Post('query')
  async queryKnowledgeBase(
    @Param('teamId') teamId: string,
    @Body('query') query: string,
    @Headers('x-user-id') requesterId: string
  ) {
    const answer = await this.kbService.askKnowledgeBase(teamId, query, requesterId);
    return { answer };
  }
}
