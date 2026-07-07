import { Controller, Post, Get, Patch, Delete, Body, Param, UseInterceptors, UploadedFile, UseGuards, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KbService } from './kb.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { UserId } from '../auth/user-id.decorator.js';

@Controller('teams/:teamId/kb')
@UseGuards(ClerkAuthGuard)
export class KbController {
  constructor(private readonly kbService: KbService) {}

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('teamId') teamId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
        ],
      }),
    ) file: Express.Multer.File,
    @UserId() requesterId: string
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    // Uploader is the authenticated caller — never trust a client-supplied id.
    return this.kbService.uploadDocument(teamId, requesterId, file, requesterId);
  }

  @Get('documents')
  async getDocuments(
    @Param('teamId') teamId: string,
    @UserId() requesterId: string
  ) {
    return this.kbService.getDocuments(teamId, requesterId);
  }

  @Delete('documents/:documentId')
  async deleteDocument(
    @Param('teamId') teamId: string,
    @Param('documentId') documentId: string,
    @UserId() requesterId: string
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
    @UserId() requesterId: string
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
    @UserId() requesterId: string
  ) {
    const answer = await this.kbService.askKnowledgeBase(teamId, query, requesterId);
    return { answer };
  }
}
