import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class PulseGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinTeam')
  handleJoinTeam(@ConnectedSocket() client: Socket, @MessageBody() teamId: string) {
    client.join(`team:${teamId}`);
    console.log(`Client ${client.id} joined room team:${teamId}`);
  }

  @SubscribeMessage('updateStatus')
  handleStatusUpdate(@MessageBody() data: { teamId: string, userId: string, status: string }) {
    // Broadcast status change specifically to the team members in that room
    this.server.to(`team:${data.teamId}`).emit('statusChanged', data);
  }

  @SubscribeMessage('sendMessage')
  handleChatMessage(@MessageBody() data: { channelId: string, senderId: string, content: string }) {
    // Broadcast message to everyone in the channel's specific room
    this.server.to(`channel:${data.channelId}`).emit('newMessage', data);
  }

  @SubscribeMessage('joinChannel')
  handleJoinChannel(@ConnectedSocket() client: Socket, @MessageBody() channelId: string) {
    client.join(`channel:${channelId}`);
    console.log(`Client ${client.id} joined room channel:${channelId}`);
  }
}