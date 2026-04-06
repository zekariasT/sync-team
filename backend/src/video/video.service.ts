import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private async checkTeamPermission(teamId: string, requesterId: string, allowedRoles: string[]) {
    if (!requesterId) throw new ForbiddenException('Unauthorized');
    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: requesterId, teamId } }
    });
    const anyAdmin = await this.prisma.teamMember.findFirst({
      where: { userId: requesterId, role: 'ADMIN' }
    });
    
    if (anyAdmin) return true;
    if (!member) throw new ForbiddenException('You do not belong to this team');
    if (!allowedRoles.includes(member.role)) throw new ForbiddenException('Insufficient permissions');
    return true;
  }

  async processVideo(teamId: string, senderId: string, fileBuffer: Buffer, mimetype: string, title?: string, requesterId?: string) {
    if (requesterId) await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
    // 1. Upload to Cloudinary
    return new Promise(async (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'syncpoint_videos' },
        async (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload error', error);
            return reject(error);
          }
          if (!result) {
              return reject(new Error('No result from Cloudinary'));
          }

          try {
            // 2. Transcribe using Gemini
            const transcript = await this.aiService.transcribeAudio(fileBuffer, mimetype);

            // 3. Save to database
            const videoMessage = await this.prisma.videoMessage.create({
              data: {
                teamId,
                senderId,
                title: title || 'Screen Recording',
                videoUrl: result.secure_url,
                duration: result.duration,
                transcript: transcript,
              },
              include: { sender: true }
            });

            resolve(videoMessage);
          } catch(err) {
            this.logger.error('Error post upload processing', err);
            reject(err);
          }
        }
      );
      
      uploadStream.end(fileBuffer);
    });
  }

  async getVideoMessages(teamId: string, requesterId?: string) {
    if (requesterId) await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
    return this.prisma.videoMessage.findMany({
      where: { teamId },
      include: {
        sender: true,
        reactions: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async addReaction(videoId: string, userId: string, timestamp: number, emoji?: string, comment?: string, requesterId?: string) {
    const video = await this.prisma.videoMessage.findUnique({ where: { id: videoId } });
    if (!video) throw new Error('Video not found');
    
    if (requesterId) await this.checkTeamPermission(video.teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);

    return this.prisma.videoReaction.create({
      data: {
        videoId,
        userId,
        timestamp,
        emoji,
        comment,
      },
      include: { user: true }
    });
  }
}
