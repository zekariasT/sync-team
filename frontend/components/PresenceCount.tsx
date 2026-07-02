'use client';

import { usePresence } from '@/components/RealTimeProvider';

/**
 * "· N online" subtitle fragment, counting only members who are actually
 * connected right now. `memberIds` scopes the count to the members this viewer
 * can see (the server-filtered Pulse grid), so presence for users outside that
 * set never inflates the number.
 */
export default function PresenceCount({ memberIds }: { memberIds: string[] }) {
  const onlineUsers = usePresence();
  if (!onlineUsers) return null; // no snapshot yet — don't claim a count
  const count = memberIds.filter((id) => onlineUsers.has(id)).length;
  if (count === 0) return null;
  return <> · {count} online</>;
}
