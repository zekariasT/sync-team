import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { UserId } from '../auth/user-id.decorator.js';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get('teams/:teamId/channels')
    async getTeamChannels(@Param('teamId') teamId: string, @UserId() requesterId?: string) {
        return this.chatService.getTeamChannels(teamId, requesterId);
    }

    @Get('channels/:channelId/messages')
    async getChannelMessages(@Param('channelId') channelId: string, @UserId() requesterId?: string) {
        return this.chatService.getChannelMessages(channelId, requesterId);
    }

    @Post('channels/:channelId/messages')
    async createMessage(
        @Param('channelId') channelId: string,
        @Body() body: { senderId: string, content: string },
        @UserId() requesterId?: string
    ) {
        return this.chatService.createMessage(channelId, body.senderId, body.content, requesterId);
    }

    @Post('teams/:teamId/channels')
    async createChannel(
        @Param('teamId') teamId: string,
        @Body() body: { name: string },
        @UserId() requesterId?: string
    ) {
        return this.chatService.createChannel(teamId, body.name, requesterId);
    }
}
