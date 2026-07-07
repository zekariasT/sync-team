import { Crown } from 'lucide-react';

/**
 * Account-level "root" indicator. Root is a global superuser attribute on the
 * user (User.isRoot), independent of any team membership — so it's shown once
 * next to the person's name, not per-team like MemberRoleBadge.
 *
 * Rendered as the solid "root" role-kind tint from the Team Pulse design system.
 */
export default function RootBadge() {
  return (
    <span
      data-kind="root"
      title="Root — global superuser"
      className="role-tint inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-0.5 text-[9.5px] font-bold uppercase leading-relaxed tracking-wider"
    >
      <Crown className="size-2.5" strokeWidth={2.5} />
      Root
    </span>
  );
}
