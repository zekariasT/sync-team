'use client';

import { useEffect, useState } from 'react';

type Accent = 'sage' | 'clay';

/**
 * Switches the brand accent between Sage (default) and Clay by toggling
 * `data-accent` on <html>, which flips the [data-accent="clay"] token block in
 * globals.css. Persisted in localStorage; applied pre-paint by the inline
 * script in app/layout.tsx so there's no flash on reload.
 */
export function AccentToggle() {
  const [accent, setAccent] = useState<Accent>('sage');

  useEffect(() => {
    const saved = (localStorage.getItem('syncpoint_accent') as Accent) || 'sage';
    setAccent(saved);
  }, []);

  const toggle = () => {
    const next: Accent = accent === 'sage' ? 'clay' : 'sage';
    setAccent(next);
    localStorage.setItem('syncpoint_accent', next);
    if (next === 'clay') document.documentElement.dataset.accent = 'clay';
    else delete document.documentElement.dataset.accent;
  };

  const nextLabel = accent === 'sage' ? 'Clay' : 'Sage';

  return (
    <button
      onClick={toggle}
      title={`Accent: ${accent === 'sage' ? 'Sage' : 'Clay'} — switch to ${nextLabel}`}
      aria-label={`Brand accent ${accent}. Switch to ${nextLabel}.`}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
    >
      {/* Live swatch reflects the current --brand value */}
      <span className="size-4 rounded-full border border-border" style={{ background: 'var(--brand)' }} />
    </button>
  );
}
