import { Injectable, Logger } from '@nestjs/common';
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

  async processVideo(teamId: string, senderId: string, fileBuffer: Buffer, mimetype: string, title?: string) {
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

  async getVideoMessages(teamId: string) {
    return this.prisma.videoMessage.findMany({
      where: { teamId },
      include: {
        sender: true,
        reactions: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async addReaction(videoId: string, userId: string, timestamp: number, emoji?: string, comment?: string) {
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
