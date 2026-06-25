import { Crown } from 'lucide-react';

/**
 * Account-level "root" indicator. Root is a global superuser attribute on the
 * user (User.isRoot), independent of any team membership — so it's shown once
 * next to the person's name, not per-team like MemberRoleBadge.
 */
export default function RootBadge() {
  return (
    <span
      title="Root — global superuser"
      className="inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-tighter text-violet-400 bg-violet-400/10 border-violet-400/20 shadow-sm"
    >
      <Crown size={10} strokeWidth={3} />
      Root
    </span>
  );
}
