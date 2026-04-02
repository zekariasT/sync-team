import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';

@Controller('video')
@UseGuards(ClerkAuthGuard)
export class VideoController {
    constructor(private readonly videoService: VideoService) {}

    @Get('teams/:teamId')
    async getTeamVideos(@Param('teamId') teamId: string) {
        return this.videoService.getVideoMessages(teamId);
    }

    @Post('teams/:teamId/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadVideo(
        @Param('teamId') teamId: string,
        @Body('senderId') senderId: string,
        @Body('title') title: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No video file provided');
        }
        if (!senderId) {
            throw new BadRequestException('senderId is required');
        }

        return this.videoService.processVideo(teamId, senderId, file.buffer, file.mimetype, title);
    }

    @Post(':videoId/reactions')
    async addReaction(
        @Param('videoId') videoId: string,
        @Body() body: { userId: string; timestamp: number; emoji?: string; comment?: string }
    ) {
        return this.videoService.addReaction(
            videoId, 
            body.userId, 
            body.timestamp, 
            body.emoji, 
            body.comment
        );
    }
}
