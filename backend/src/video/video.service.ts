import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { AiService } from '../ai/ai.service.js';
import { PulseGateway } from '../pulse/pulse.gateway.js';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private gateway: PulseGateway,
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
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId }, select: { isRoot: true }
    });
    if (requester?.isRoot) return true; // global root: account-level superuser
    const anyAdmin = await this.prisma.teamMember.findFirst({
      where: { userId: requesterId, role: 'ADMIN' }
    });

    if (anyAdmin) return true;
    if (!member) throw new ForbiddenException('You do not belong to this team');
    if (!allowedRoles.includes(member.role)) throw new ForbiddenException('Insufficient permissions');
    return true;
  }

  async processVideo(teamId: string, senderId: string, fileBuffer: Buffer, mimetype: string, title?: string, requesterId?: string, taggedUserIds: string[] = []) {
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
            const resolvedTitle = title || 'Screen Recording';
            const videoMessage = await this.prisma.videoMessage.create({
              data: {
                teamId,
                senderId,
                title: resolvedTitle,
                videoUrl: result.secure_url,
                duration: result.duration,
                transcript: transcript,
              },
              include: { sender: true }
            });

            // 4. Tag teammates + notify them (best-effort: never fail the upload)
            try {
              await this.tagAndNotify(videoMessage.id, teamId, senderId, resolvedTitle, videoMessage.sender?.name, taggedUserIds);
            } catch (tagErr) {
              this.logger.error('Tagging/notification failed', tagErr);
            }

            // Return the video with its tags so the client can render them immediately.
            const withTags = await this.prisma.videoMessage.findUnique({
              where: { id: videoMessage.id },
              include: { sender: true, tags: { include: { user: true } } },
            });

            resolve(withTags ?? videoMessage);
          } catch(err) {
            this.logger.error('Error post upload processing', err);
            reject(err);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Persist video tags and create + push a notification to each tagged teammate.
   * Only members of the video's team are tagged, and the sender is never notified
   * of their own tag.
   */
  private async tagAndNotify(videoId: string, teamId: string, senderId: string, title: string, senderName: string | undefined, taggedUserIds: string[]) {
    const uniqueIds = [...new Set(taggedUserIds)].filter((id) => id && id !== senderId);
    if (uniqueIds.length === 0) return;

    // Keep only ids that are actually members of this team.
    const members = await this.prisma.teamMember.findMany({
      where: { teamId, userId: { in: uniqueIds } },
      select: { userId: true },
    });
    const recipientIds = members.map((m) => m.userId);
    if (recipientIds.length === 0) return;

    await this.prisma.videoTag.createMany({
      data: recipientIds.map((userId) => ({ videoId, userId })),
      skipDuplicates: true,
    });

    const actorName = senderName || 'Someone';
    await this.prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        actorId: senderId,
        type: 'video_tag',
        videoId,
        teamId,
        message: `${actorName} tagged you in "${title}"`,
      })),
    });

    // createMany doesn't return the created rows, so fetch them back to push
    // full notification objects over the socket.
    const notifications = await this.prisma.notification.findMany({
      where: { videoId, type: 'video_tag', userId: { in: recipientIds } },
    });
    for (const notification of notifications) {
      this.gateway.notifyUser(notification.userId, notification);
    }
  }

  async getVideoMessages(teamId: string, requesterId?: string) {
    if (requesterId) await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
    return this.prisma.videoMessage.findMany({
      where: { teamId },
      include: {
        sender: true,
        reactions: { include: { user: true } },
        tags: { include: { user: true } },
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
