import { Controller, Post, Get, Patch, Delete, Body, Param, UseInterceptors, UploadedFile, UseGuards, Headers, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
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
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
        ],
      }),
    ) file: Express.Multer.File,
    @Headers('x-user-id') requesterId: string
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.kbService.uploadDocument(teamId, uploaderId, file, requesterId);
  }

  @Get('documents')
  async getDocuments(
    @Param('teamId') teamId: string,
    @Headers('x-user-id') requesterId: string
  ) {
    return this.kbService.getDocuments(teamId, requesterId);
  }

  @Delete('documents/:documentId')
  async deleteDocument(
    @Param('teamId') teamId: string,
    @Param('documentId') documentId: string,
    @Headers('x-user-id') requesterId: string
  ) {
    return this.kbService.deleteDocument(teamId, documentId, requesterId);
  }

  @Patch('documents/:documentId')
  @UseInterceptors(FileInterceptor('file'))
  async updateDocument(
    @Param('teamId') teamId: string,
    @Param('documentId') documentId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
        ],
      }),
    ) file: Express.Multer.File,
    @Headers('x-user-id') requesterId: string
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.kbService.updateDocument(teamId, documentId, file, requesterId);
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
