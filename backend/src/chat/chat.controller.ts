import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';

@Controller('chat')
@UseGuards(ClerkAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get('teams/:teamId/channels')
    async getTeamChannels(@Param('teamId') teamId: string) {
        return this.chatService.getTeamChannels(teamId);
    }

    @Get('channels/:channelId/messages')
    async getChannelMessages(@Param('channelId') channelId: string) {
        return this.chatService.getChannelMessages(channelId);
    }

    @Post('channels/:channelId/messages')
    async createMessage(
        @Param('channelId') channelId: string,
        @Body() body: { senderId: string, content: string }
    ) {
        return this.chatService.createMessage(channelId, body.senderId, body.content);
    }

    @Post('teams/:teamId/channels')
    async createChannel(
        @Param('teamId') teamId: string,
        @Body() body: { name: string }
    ) {
        return this.chatService.createChannel(teamId, body.name);
    }
}
