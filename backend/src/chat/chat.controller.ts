import { Controller, Get, Post, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { ChatService } from './chat.service.js';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get('teams/:teamId/channels')
    async getTeamChannels(@Param('teamId') teamId: string, @Headers('x-user-id') requesterId?: string) {
        return this.chatService.getTeamChannels(teamId, requesterId);
    }

    @Get('channels/:channelId/messages')
    async getChannelMessages(@Param('channelId') channelId: string, @Headers('x-user-id') requesterId?: string) {
        return this.chatService.getChannelMessages(channelId, requesterId);
    }

    @Post('channels/:channelId/messages')
    async createMessage(
        @Param('channelId') channelId: string,
        @Body() body: { senderId: string, content: string },
        @Headers('x-user-id') requesterId?: string
    ) {
        return this.chatService.createMessage(channelId, body.senderId, body.content, requesterId);
    }

    @Post('teams/:teamId/channels')
    async createChannel(
        @Param('teamId') teamId: string,
        @Body() body: { name: string },
        @Headers('x-user-id') requesterId?: string
    ) {
        return this.chatService.createChannel(teamId, body.name, requesterId);
    }
}
