/**
 * Event contracts shared (by convention) between core-api and ai-worker.
 * Kept duplicated in each service to avoid a shared-package build step for the demo;
 * in production these would live in a versioned `@sync-team/contracts` package.
 */

/** Emitted by core-api when a document is created or replaced. The worker (re)indexes it. */
export const DOCUMENT_UPLOADED = 'document.uploaded';

/** Emitted by core-api when a document is deleted. The worker removes its vectors. */
export const DOCUMENT_DELETED = 'document.deleted';

export interface DocumentUploadedEvent {
  document: {
    id: string;
    teamId: string;
    title: string;
    fileUrl: string;
  };
  /** Extracted plain text — core-api owns parsing so the worker stays storage-agnostic. */
  text: string;
}

export interface DocumentDeletedEvent {
  documentId: string;
  teamId: string;
}
