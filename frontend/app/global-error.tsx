'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Global Error Boundary — catches errors in the root layout itself.
 * This is the absolute last line of defense. It must supply its own
 * <html> and <body> tags because the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#020617',
          color: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <div
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '1rem',
              backgroundColor: 'rgba(251, 113, 133, 0.1)',
              border: '1px solid rgba(251, 113, 133, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <AlertTriangle size={36} color="#fb7185" />
          </div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              marginBottom: '0.5rem',
            }}
          >
            Critical Error
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(148, 163, 184, 0.5)',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}
          >
            The application encountered a critical error. Please try reloading
            the page. If the issue persists, contact support.
          </p>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#38bdf8',
              color: '#020617',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RefreshCcw size={16} />
            Reload Application
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: '1.5rem',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: 'rgba(148, 163, 184, 0.3)',
                letterSpacing: '0.05em',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
