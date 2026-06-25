import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service.js';
import { UserId } from '../auth/user-id.decorator.js';
import { AddReactionDto } from '../dto/video.dto.js';

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
        @Body('taggedUserIds') taggedUserIdsRaw: string,
        @UploadedFile() file: Express.Multer.File,
        @UserId() requesterId?: string
    ) {
        if (!file) {
            throw new BadRequestException('No video file provided');
        }
        if (!senderId) {
            throw new BadRequestException('senderId is required');
        }

        // taggedUserIds arrives as a JSON-encoded array in the multipart form.
        // Parse defensively — a malformed value just means "no tags".
        let taggedUserIds: string[] = [];
        if (taggedUserIdsRaw) {
            try {
                const parsed = JSON.parse(taggedUserIdsRaw);
                if (Array.isArray(parsed)) {
                    taggedUserIds = parsed.filter((id): id is string => typeof id === 'string');
                }
            } catch {
                // ignore — leave taggedUserIds empty
            }
        }

        return this.videoService.processVideo(teamId, senderId, file.buffer, file.mimetype, title, requesterId, taggedUserIds);
    }

    @Post(':videoId/reactions')
    async addReaction(
        @Param('videoId') videoId: string,
        @Body() body: AddReactionDto,
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
