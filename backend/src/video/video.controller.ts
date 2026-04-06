import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service.js';
import { UserId } from '../auth/user-id.decorator.js';

@Controller('video')
export class VideoController {
    constructor(private readonly videoService: VideoService) {}

    @Get('teams/:teamId')
    async getTeamVideos(@Param('teamId') teamId: string, @UserId() requesterId?: string) {
        return this.videoService.getVideoMessages(teamId, requesterId);
    }

    @Post('teams/:teamId/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadVideo(
        @Param('teamId') teamId: string,
        @Body('senderId') senderId: string,
        @Body('title') title: string,
        @UploadedFile() file: Express.Multer.File,
        @UserId() requesterId?: string
    ) {
        if (!file) {
            throw new BadRequestException('No video file provided');
        }
        if (!senderId) {
            throw new BadRequestException('senderId is required');
        }

        return this.videoService.processVideo(teamId, senderId, file.buffer, file.mimetype, title, requesterId);
    }

    @Post(':videoId/reactions')
    async addReaction(
        @Param('videoId') videoId: string,
        @Body() body: { userId: string; timestamp: number; emoji?: string; comment?: string },
        @UserId() requesterId?: string
    ) {
        return this.videoService.addReaction(
            videoId, 
            body.userId, 
            body.timestamp, 
            body.emoji, 
            body.comment,
            requesterId
        );
    }
}
