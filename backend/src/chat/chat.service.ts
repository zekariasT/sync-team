import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ChatService {
    constructor(private prisma: PrismaService) { }

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

    async getTeamChannels(teamId: string, requesterId?: string) {
        if (requesterId) await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
        return this.prisma.channel.findMany({
            where: { teamId },
        });
    }

    async getChannelMessages(channelId: string, requesterId?: string) {
        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) throw new Error('Channel not found');
        
        if (requesterId) await this.checkTeamPermission(channel.teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);

        return this.prisma.message.findMany({
            where: { channelId },
            include: { sender: true },
            orderBy: { createdAt: 'asc' },
        });
    }

    async createMessage(channelId: string, senderId: string, content: string, requesterId?: string) {
        const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
        if (!channel) throw new Error('Channel not found');
        
        if (requesterId) await this.checkTeamPermission(channel.teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);

        return this.prisma.message.create({
            data: {
                channelId,
                senderId,
                content,
            },
            include: { sender: true },
        });
    }

    async createChannel(teamId: string, name: string, requesterId?: string) {
        if (requesterId) await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD']);
        return this.prisma.channel.create({
            data: {
                teamId,
                name,
            },
        });
    }
}
