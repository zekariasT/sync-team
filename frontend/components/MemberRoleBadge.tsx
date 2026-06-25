'use client';

import { useState } from 'react';
import { updateRole } from '@/app/actions';
import { toast } from 'sonner';
import { ChevronDown, Shield, User, Star, type LucideIcon } from 'lucide-react';
import { badgeVariants } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MemberRoleBadgeProps {
  memberId: string;
  teamId: string;
  role: string;
  canEdit: boolean;
  // Granting or revoking the ADMIN role is reserved for root users. When false,
  // the ADMIN option is hidden and existing admins can't be edited here.
  canGrantAdmin?: boolean;
  onChanged?: () => void;
}

type RoleDef = { label: string; value: string; icon: LucideIcon; color: string };

// Each role carries an icon as well as a hue so role is never conveyed by
// color alone (a11y: color-not-only).
const ALL_ROLES: RoleDef[] = [
  { label: 'Admin', value: 'ADMIN', icon: Star, color: 'border-primary/30 bg-primary/10 text-primary' },
  { label: 'Lead', value: 'LEAD', icon: Shield, color: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { label: 'Member', value: 'MEMBER', icon: User, color: 'border-border bg-muted text-muted-foreground' },
];

export default function MemberRoleBadge({ memberId, teamId, role, canEdit, canGrantAdmin = false, onChanged }: MemberRoleBadgeProps) {
  const [loading, setLoading] = useState(false);

  // Only root may assign ADMIN; everyone else manages LEAD/MEMBER.
  const roles = ALL_ROLES.filter((r) => r.value !== 'ADMIN' || canGrantAdmin);
  const current = ALL_ROLES.find((r) => r.value === role) ?? ALL_ROLES[2];
  const Icon = current.icon;
  // A non-root user can't change a member who is already ADMIN (revoking admin
  // is root-only) — matches the backend rule.
  const editable = canEdit && (role !== 'ADMIN' || canGrantAdmin);

  const handleRoleChange = async (newRole: string) => {
    if (newRole === role || !editable) return;
    setLoading(true);
    try {
      const result = await updateRole(memberId, teamId, newRole);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Role updated');
        onChanged?.();
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const triggerClass = cn(
    badgeVariants({ variant: 'outline' }),
    current.color,
    'font-semibold uppercase tracking-tight',
    editable && 'cursor-pointer',
    loading && 'animate-pulse',
  );

  if (!editable) {
    return (
      <span className={triggerClass}>
        <Icon data-icon="inline-start" />
        {current.label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={triggerClass}
        disabled={loading}
        aria-label={`Change role, currently ${current.label}`}
      >
        <Icon data-icon="inline-start" />
        {current.label}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-32">
        <DropdownMenuGroup>
          {roles.map((r) => {
            const RoleIcon = r.icon;
            return (
              <DropdownMenuItem
                key={r.value}
                disabled={r.value === role}
                onSelect={() => handleRoleChange(r.value)}
              >
                <RoleIcon data-icon="inline-start" />
                {r.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
