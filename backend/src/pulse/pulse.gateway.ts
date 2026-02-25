import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class PulseGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('updateStatus')
  handleStatusUpdate(@MessageBody() data: { memberId: number, status: string }) {
    this.server.emit('statusChanged', data);
  }
}