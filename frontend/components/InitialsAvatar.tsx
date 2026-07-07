import { cn } from '@/lib/utils';

const TINTS = ['sage', 'clay', 'amber'] as const;
export type AvatarTint = (typeof TINTS)[number] | 'primary';

/** Stable per-user tint (sage/clay/amber); root and self pin to the solid primary. */
export function tintFor(seed: string, isRoot?: boolean): AvatarTint {
  if (isRoot) return 'primary';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Up to two initials from a display name (first + last). */
export function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

/**
 * Initials-only avatar (the Team Pulse design uses tinted initial squares, never
 * photos). Size + corner radius come from `className` (defaults to a 40px square,
 * rounded-lg). `tint` forces a specific tint (e.g. "primary" for the current
 * user in chrome); otherwise it's derived from `seed`/`name`.
 */
export function InitialsAvatar({
  name,
  seed,
  isRoot,
  tint,
  className,
}: {
  name?: string | null;
  seed?: string;
  isRoot?: boolean;
  tint?: AvatarTint;
  className?: string;
}) {
  return (
    <div
      data-tint={tint ?? tintFor(seed ?? name ?? '', isRoot)}
      aria-hidden
      className={cn(
        'avatar-tint flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
        className,
      )}
    >
      {initialsOf(name)}
    </div>
  );
}
