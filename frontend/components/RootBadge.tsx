import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Account-level "root" indicator. Root is a global superuser attribute on the
 * user (User.isRoot), independent of any team membership — so it's shown once
 * next to the person's name, not per-team like MemberRoleBadge.
 */
export default function RootBadge() {
  return (
    <Badge
      variant="outline"
      title="Root — global superuser"
      className="gap-1 border-brand-accent/30 bg-brand-accent/10 text-brand-accent"
    >
      <Crown />
      Root
    </Badge>
  );
}
