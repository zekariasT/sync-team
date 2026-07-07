import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

/** Injection token for the RabbitMQ producer used to dispatch async work. */
export const EVENTS_CLIENT = 'EVENTS_CLIENT';

/**
 * Registers a RabbitMQ ClientProxy. core-api is a PRODUCER only — it emits
 * events onto the durable queue that the ai-worker consumes. Importing this
 * module anywhere makes `@Inject(EVENTS_CLIENT) ClientProxy` available.
 */
@Module({
  imports: [
    ClientsModule.register([
      {
        name: EVENTS_CLIENT,
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: process.env.RABBITMQ_QUEUE || 'kb_indexing_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MessagingModule {}
