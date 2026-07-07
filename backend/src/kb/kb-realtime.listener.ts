import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PulseGateway } from '../pulse/pulse.gateway.js';

/**
 * Subscribes to the Redis channel the ai-worker publishes to, and relays each
 * notification to the relevant team's socket.io room. This is the bridge that
 * turns "the worker finished indexing" into a live UI update with no page refresh.
 *
 * Flow:  ai-worker --(redis pub/sub: kb:events)--> this listener --(socket.io: kb:indexed)--> browser
 */
@Injectable()
export class KbRealtimeListener implements OnModuleInit, OnModuleDestroy {
  static readonly CHANNEL = 'kb:events';

  private readonly logger = new Logger(KbRealtimeListener.name);
  private subscriber: Redis | null = null;

  constructor(private readonly gateway: PulseGateway) {}

  onModuleInit(): void {
    this.subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.subscriber.subscribe(KbRealtimeListener.CHANNEL, (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${KbRealtimeListener.CHANNEL}: ${err.message}`);
      } else {
        this.logger.log(`Subscribed to Redis channel "${KbRealtimeListener.CHANNEL}"`);
      }
    });

    this.subscriber.on('message', (_channel, raw) => {
      try {
        const payload = JSON.parse(raw);
        if (!payload?.teamId) return;
        // Emit under an event name matching the payload type — frontend listens for
        // "kb:indexed" (title/chunks, indexing complete) and "document.removed"
        // (deletion) separately; they aren't interchangeable.
        const eventName = payload.type === 'document.removed' ? 'document.removed' : 'kb:indexed';
        this.gateway.server?.to(`team:${payload.teamId}`).emit(eventName, payload);
        this.logger.log(`Relayed ${payload.type} → team:${payload.teamId}`);
      } catch (e: any) {
        this.logger.error(`Malformed realtime payload: ${e.message}`);
      }
    });
  }

  onModuleDestroy(): void {
    void this.subscriber?.quit();
  }
}
