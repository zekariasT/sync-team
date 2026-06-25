import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Publishes realtime notifications to Redis pub/sub. core-api subscribes to the
 * same channel and fans messages out to the right team's socket.io room.
 * RabbitMQ carries the *work*; Redis carries the *live UI signal*.
 */
@Injectable()
export class RedisPublisher implements OnModuleDestroy {
  static readonly CHANNEL = 'kb:events';

  private readonly logger = new Logger(RedisPublisher.name);
  private readonly client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  async publish(payload: Record<string, unknown>): Promise<void> {
    try {
      await this.client.publish(RedisPublisher.CHANNEL, JSON.stringify(payload));
      this.logger.log(`Published ${String(payload.type)} → ${RedisPublisher.CHANNEL}`);
    } catch (e: any) {
      this.logger.error(`Redis publish failed: ${e.message}`);
    }
  }

  onModuleDestroy(): void {
    void this.client.quit();
  }
}
