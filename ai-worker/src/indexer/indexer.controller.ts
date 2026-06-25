import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { IndexerService } from './indexer.service.js';
import { DOCUMENT_UPLOADED, DOCUMENT_DELETED } from '../messaging/contracts.js';
import type {
  DocumentUploadedEvent,
  DocumentDeletedEvent,
} from '../messaging/contracts.js';

/**
 * RabbitMQ message handlers. Manual ack/nack: a message is only acked after the
 * work succeeds, so killing the worker mid-job leaves the job on the queue to be
 * retried — the resilience story worth demoing.
 */
@Controller()
export class IndexerController {
  private readonly logger = new Logger(IndexerController.name);

  constructor(private readonly indexer: IndexerService) {}

  @EventPattern(DOCUMENT_UPLOADED)
  async onDocumentUploaded(
    @Payload() data: DocumentUploadedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    this.logger.log(`Received ${DOCUMENT_UPLOADED} for document ${data?.document?.id}`);
    try {
      await this.indexer.index(data);
      channel.ack(message);
    } catch (e: any) {
      this.logger.error(`Indexing failed: ${e.message}`);
      // requeue=false → don't hot-loop a poison message (would go to a DLQ in prod).
      channel.nack(message, false, false);
    }
  }

  @EventPattern(DOCUMENT_DELETED)
  async onDocumentDeleted(
    @Payload() data: DocumentDeletedEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    this.logger.log(`Received ${DOCUMENT_DELETED} for document ${data?.documentId}`);
    try {
      await this.indexer.remove(data);
      channel.ack(message);
    } catch (e: any) {
      this.logger.error(`De-indexing failed: ${e.message}`);
      channel.nack(message, false, false);
    }
  }
}
