'use client';

import { useState } from 'react';
import { updateRole } from '@/app/actions';
import { toast } from 'sonner';
import { ChevronDown, Shield, User, Star, type LucideIcon } from 'lucide-react';
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

type RoleDef = { label: string; value: string; kind: 'admin' | 'lead' | 'member'; icon: LucideIcon };

// Each role pairs a text label with a semantic tint (admin/sage, lead/amber,
// member/neutral) so role is never conveyed by color alone (a11y).
const ALL_ROLES: RoleDef[] = [
  { label: 'Admin', value: 'ADMIN', kind: 'admin', icon: Star },
  { label: 'Lead', value: 'LEAD', kind: 'lead', icon: Shield },
  { label: 'Member', value: 'MEMBER', kind: 'member', icon: User },
];

const badgeClass =
  'role-tint inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10.5px] font-semibold uppercase leading-relaxed tracking-wide transition-[filter]';

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

  if (!editable) {
    return (
      <span data-kind={current.kind} className={badgeClass}>
        <Icon className="size-2.5" strokeWidth={2.5} />
        {current.label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-kind={current.kind}
        className={cn(badgeClass, 'cursor-pointer hover:brightness-[0.97]', loading && 'animate-pulse')}
        disabled={loading}
        aria-label={`Change role, currently ${current.label}`}
      >
        <Icon className="size-2.5" strokeWidth={2.5} />
        {current.label}
        <ChevronDown className="size-2.5 opacity-60" strokeWidth={2.5} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-32">
        <DropdownMenuGroup>
          {roles.map((r) => {
            const RoleIcon = r.icon;
            return (
              <DropdownMenuItem key={r.value} disabled={r.value === role} onSelect={() => handleRoleChange(r.value)}>
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
