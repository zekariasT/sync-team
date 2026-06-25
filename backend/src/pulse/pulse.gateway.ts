import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayConnection } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { PrismaService } from '../prisma.service.js';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

@WebSocketGateway({ cors: { origin: allowedOrigins, credentials: true } })
export class PulseGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PulseGateway.name);
  private clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  constructor(private readonly prisma: PrismaService) {}

  // Handshake middleware runs before any client event is processed, so the
  // verified identity is guaranteed to be set by the time joinTeam arrives.
  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (token && typeof token === 'string' && token !== 'null' && token !== 'undefined') {
          const claims = await this.clerkClient.verifyToken(token);
          socket.data.userId = claims.sub;
        } else {
          // No token → unprivileged public-demo identity. Room access is still
          // gated by team membership below, so this cannot reach private teams.
          socket.data.userId = 'guest-demo-user';
        }
        next();
      } catch (err) {
        this.logger.warn(`Rejected socket ${socket.id}: invalid token`);
        next(new Error('Unauthorized'));
      }
    });
  }

  // The handshake middleware (server.use, above) has already verified the token
  // and populated socket.data.userId by the time a connection is established, so
  // every socket is auto-subscribed to its own user room for targeted delivery
  // (e.g. "you were tagged in a video"). Team-scoped events still use team rooms.
  handleConnection(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      client.join(`user:${userId}`);
      this.logger.log(`Client ${client.id} (${userId}) joined room user:${userId}`);
    }
  }

  /** Push a notification to a single user across all of their open sockets. */
  notifyUser(userId: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit('notification:new', payload);
  }

  private async canAccessTeam(userId: string | undefined, teamId: string): Promise<boolean> {
    if (!userId || !teamId) return false;
    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (member) return true;
    // Global root (account-level superuser) and cross-team admins may observe
    // any team (mirrors the HTTP permission model).
    const requester = await this.prisma.user.findUnique({ where: { id: userId }, select: { isRoot: true } });
    if (requester?.isRoot) return true;
    const admin = await this.prisma.teamMember.findFirst({ where: { userId, role: 'ADMIN' } });
    return !!admin;
  }

  @SubscribeMessage('joinTeam')
  async handleJoinTeam(@ConnectedSocket() client: Socket, @MessageBody() teamId: string) {
    const userId = client.data.userId as string | undefined;
    if (typeof teamId !== 'string' || !(await this.canAccessTeam(userId, teamId))) {
      this.logger.warn(`Denied joinTeam team:${teamId} for ${userId ?? 'unknown'}`);
      return;
    }
    client.join(`team:${teamId}`);
    this.logger.log(`Client ${client.id} (${userId}) joined room team:${teamId}`);
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
  async handleJoinChannel(@ConnectedSocket() client: Socket, @MessageBody() channelId: string) {
    const userId = client.data.userId as string | undefined;
    if (typeof channelId !== 'string') return;
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel || !(await this.canAccessTeam(userId, channel.teamId))) {
      this.logger.warn(`Denied joinChannel channel:${channelId} for ${userId ?? 'unknown'}`);
      return;
    }
    client.join(`channel:${channelId}`);
    this.logger.log(`Client ${client.id} (${userId}) joined room channel:${channelId}`);
  }
}
