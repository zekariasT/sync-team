'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for debugging
    console.error('[SyncPoint Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={36} className="text-accent" />
        </div>
        <h2 className="text-2xl font-black tracking-tighter text-text mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-primary/50 mb-8 leading-relaxed">
          An unexpected error occurred. Our team has been notified
          and is working on a fix. You can try again or refresh the page.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-secondary hover:brightness-110 text-background px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-secondary/20"
          >
            <RefreshCcw size={16} />
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-primary/10 border border-primary/15 hover:bg-primary/15 text-text px-5 py-2.5 rounded-xl font-bold transition-all"
          >
            Reload Page
          </button>
        </div>
        {error.digest && (
          <p className="mt-6 text-[10px] font-mono text-primary/30 tracking-wide">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
