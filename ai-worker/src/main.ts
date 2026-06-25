import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module.js';

/**
 * The AI Worker has NO HTTP server. It is a pure RabbitMQ consumer:
 * one durable queue, manual ack, prefetch=1 so a crash never loses a job.
 */
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: process.env.RABBITMQ_QUEUE || 'kb_indexing_queue',
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 1,
    },
  });

  await app.listen();
  Logger.log('AI Worker is listening for document events on RabbitMQ', 'Bootstrap');
}

void bootstrap();
