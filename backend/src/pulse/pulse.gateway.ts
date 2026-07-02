import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { PrismaService } from '../prisma.service.js';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

// Grace window before a user with no remaining sockets is declared offline.
// A page reload/navigation tears down the old socket and opens a new one a beat
// later; without this delay every refresh would flap the presence dot
// offline→online. Standard reconnect-debounce for socket presence.
const PRESENCE_GRACE_MS = 8000;

// Tokenless sockets get this shared pseudo-identity in the handshake below.
// They are excluded from presence entirely: never ref-counted, never broadcast.
const GUEST_USER_ID = 'guest-demo-user';

// Root/admins may observe every team's members (mirrors members.service
// findAll), so their sockets join this room to receive all presence updates.
const PRESENCE_OBSERVERS_ROOM = 'presence:observers';

@WebSocketGateway({ cors: { origin: allowedOrigins, credentials: true } })
export class PulseGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PulseGateway.name);
  private clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  // Presence is ref-counted per user: a user is "online" as long as they hold at
  // least one live socket (multiple tabs/devices collapse to one online state).
  // This is in-memory and per-process — fine for the single-instance core-api;
  // a horizontally-scaled deploy would need a shared store (e.g. the
  // socket.io-redis adapter) so presence is consistent across nodes.
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly offlineTimers = new Map<string, NodeJS.Timeout>();

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
          socket.data.userId = GUEST_USER_ID;
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
  async handleConnection(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    client.join(`user:${userId}`);
    this.logger.log(`Client ${client.id} (${userId}) joined room user:${userId}`);

    // Guests carry a shared pseudo-identity with no team memberships: they get
    // no presence data and are never counted as online themselves.
    if (userId === GUEST_USER_ID) {
      client.emit('presence:state', []);
      return;
    }

    // Register the socket synchronously, before any await, so a disconnect
    // racing the DB lookups below can't strand a dead socket in the map.
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    const wasOffline = sockets.size === 0;
    sockets.add(client.id);
    this.userSockets.set(userId, sockets);

    // A reconnect within the grace window cancels a pending offline broadcast.
    const pending = this.offlineTimers.get(userId);
    if (pending) {
      clearTimeout(pending);
      this.offlineTimers.delete(userId);
    }

    // Auto-join the user's team rooms so team-scoped events (presence:update,
    // statusChanged, kb:indexed, ...) reach them without an explicit joinTeam.
    const [memberships, user] = await Promise.all([
      this.prisma.teamMember.findMany({ where: { userId }, select: { teamId: true, role: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { isRoot: true } }),
    ]);
    const teamIds = memberships.map((m) => m.teamId);
    const isPrivileged = !!user?.isRoot || memberships.some((m) => m.role === 'ADMIN');
    client.join(teamIds.map((id) => `team:${id}`));
    if (isPrivileged) client.join(PRESENCE_OBSERVERS_ROOM);

    // Send the connecting client the presence snapshot it is allowed to see
    // (mirrors members.service findAll visibility) so its UI starts correct.
    client.emit('presence:state', await this.visibleOnlineUserIds(userId, isPrivileged, teamIds));

    if (wasOffline && !pending) {
      await this.broadcastPresence(userId, true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(client.id);
    if (sockets.size > 0) return; // still online on another tab/device

    this.userSockets.delete(userId);
    // Defer the offline announcement: if the user is just reloading, a new
    // socket will land within the grace window and cancel this timer.
    const timer = setTimeout(() => {
      this.offlineTimers.delete(userId);
      if (!this.userSockets.has(userId)) {
        this.broadcastPresence(userId, false).catch((err) =>
          this.logger.error(`Presence offline broadcast failed for ${userId}: ${err}`),
        );
      }
    }, PRESENCE_GRACE_MS);
    this.offlineTimers.set(userId, timer);
  }

  // Cancel pending grace timers so shutdown isn't held open (and a late timer
  // doesn't emit into a closed server) on deploy restarts / watch reloads.
  onModuleDestroy(): void {
    for (const timer of this.offlineTimers.values()) clearTimeout(timer);
    this.offlineTimers.clear();
    this.userSockets.clear();
  }

  /** Currently-online user IDs. Includes users in the grace window (sockets
   *  gone but not yet broadcast offline) so a snapshot never contradicts the
   *  incremental presence:update stream other clients have already seen. */
  private onlineUserIds(): string[] {
    return [...new Set([...this.userSockets.keys(), ...this.offlineTimers.keys()])];
  }

  /** The online users a given viewer may see: everyone for root/admins,
   *  otherwise only teammates (mirrors members.service findAll). */
  private async visibleOnlineUserIds(viewerId: string, isPrivileged: boolean, teamIds: string[]): Promise<string[]> {
    const online = this.onlineUserIds();
    if (isPrivileged) return online;
    const teammates = teamIds.length
      ? await this.prisma.teamMember.findMany({
          where: { teamId: { in: teamIds } },
          select: { userId: true },
        })
      : [];
    const visible = new Set(teammates.map((t) => t.userId));
    visible.add(viewerId);
    return online.filter((id) => visible.has(id));
  }

  /** Announce a presence transition, scoped to who may see this user: their
   *  teams' rooms, cross-team observers (root/admins), and their own sockets
   *  (socket.io dedupes clients that sit in several of these rooms). */
  private async broadcastPresence(userId: string, online: boolean): Promise<void> {
    this.logger.log(`Presence: ${userId} is now ${online ? 'online' : 'offline'}`);
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const rooms = [PRESENCE_OBSERVERS_ROOM, `user:${userId}`, ...memberships.map((m) => `team:${m.teamId}`)];
    this.server.to(rooms).emit('presence:update', { userId, online });
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
