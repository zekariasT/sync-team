import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

    async getTeamChannels(teamId: string) {
        return this.prisma.channel.findMany({
            where: { teamId },
        });
    }

    async getChannelMessages(channelId: string) {
        return this.prisma.message.findMany({
            where: { channelId },
            include: { sender: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async createMessage(channelId: string, senderId: string, content: string) {
        return this.prisma.message.create({
            data: {
                channelId,
                senderId,
                content,
            },
            include: { sender: true },
        });
    }

    async createChannel(teamId: string, name: string) {
        return this.prisma.channel.create({
            data: {
                teamId,
                name,
            },
        });
    }
}
