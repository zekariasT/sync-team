'use client';

import { usePresence } from '@/components/RealTimeProvider';

/**
 * Live online/offline pill for a single member. Reflects real socket presence
 * (whether the user currently holds an open WebSocket), kept in sync by
 * RealTimeProvider — not the custom status *text*, which is a separate concept.
 */
export default function PresenceIndicator({ userId }: { userId: string }) {
  const onlineUsers = usePresence();

  // No snapshot yet (socket connecting, or unreachable): render a neutral dot
  // with no label rather than falsely asserting "Offline" for everyone.
  if (!onlineUsers) {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="size-2 rounded-full bg-text-faint opacity-40" aria-hidden />
      </span>
    );
  }

  const online = onlineUsers.has(userId);

  return (
    <span className="flex shrink-0 items-center gap-1.5" aria-live="polite">
      <span
        className={online ? 'size-2 rounded-full bg-presence' : 'size-2 rounded-full bg-text-faint'}
        style={online ? { boxShadow: '0 0 0 3px var(--brand-soft)' } : undefined}
        aria-hidden
      />
      <span className={`text-[10px] font-bold uppercase tracking-wider ${online ? 'text-brand-text' : 'text-text-faint'}`}>
        {online ? 'Online' : 'Offline'}
      </span>
    </span>
  );
}
