/**
 * Event contracts shared (by convention) between core-api and ai-worker.
 * Kept in sync with ai-worker/src/messaging/contracts.ts. In production these
 * would live in a versioned `@sync-team/contracts` package.
 */

/** Emitted when a document is created or replaced. The worker (re)indexes it. */
export const DOCUMENT_UPLOADED = 'document.uploaded';

/** Emitted when a document is deleted. The worker removes its vectors. */
export const DOCUMENT_DELETED = 'document.deleted';

export interface DocumentUploadedEvent {
  document: {
    id: string;
    teamId: string;
    title: string;
    fileUrl: string;
  };
  text: string;
}

export interface DocumentDeletedEvent {
  documentId: string;
  teamId: string;
}
