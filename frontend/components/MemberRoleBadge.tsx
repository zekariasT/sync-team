'use client';

import { useState } from 'react';
import { updateRole } from '@/app/actions';
import { useToast } from './ToastProvider';
import { ChevronDown, Shield, User, Star } from 'lucide-react';

interface MemberRoleBadgeProps {
  memberId: string;
  teamId: string;
  role: string;
  canEdit: boolean;
}

export default function MemberRoleBadge({ memberId, teamId, role, canEdit }: MemberRoleBadgeProps) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const roles = [
    { label: 'Admin', value: 'ADMIN', icon: Star, color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
    { label: 'Lead', value: 'LEAD', icon: Shield, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    { label: 'Member', value: 'MEMBER', icon: User, color: 'text-primary/50 bg-primary/10 border-primary/15' },
  ];

  const currentRole = roles.find(r => r.value === role) || roles[2];

  const handleRoleChange = async (newRole: string) => {
    if (newRole === role || !canEdit) return;
    setLoading(true);
    setShowMenu(false);
    try {
      const result = await updateRole(memberId, teamId, newRole);
      if (result?.error) {
        toastError(result.error);
      } else {
        success('Role updated successfully');
      }
    } catch (err: any) {
      toastError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => canEdit && setShowMenu(!showMenu)}
        disabled={loading || !canEdit}
        className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${currentRole.color} ${canEdit ? 'hover:brightness-125 cursor-pointer shadow-sm' : ''} ${loading ? 'animate-pulse' : ''}`}
      >
        <currentRole.icon size={10} strokeWidth={3} />
        {currentRole.label}
        {canEdit && <ChevronDown size={10} className={`transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />}
      </button>

      {showMenu && (
        <div className="absolute top-full left-0 mt-1 min-w-[100px] bg-background border border-primary/20 rounded-lg shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          {roles.map(r => (
            <button
              key={r.value}
              onClick={() => handleRoleChange(r.value)}
              disabled={r.value === role}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all text-left
                ${r.value === role ? 'bg-primary/10 text-primary/30 cursor-not-allowed' : 'text-text hover:bg-primary/5'}`}
            >
              <r.icon size={12} className={r.color.split(' ')[0]} />
              {r.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Click outside backdrop */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setShowMenu(false)} 
        />
      )}
    </div>
  );
}
