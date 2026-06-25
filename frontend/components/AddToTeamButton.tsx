'use client';

import { useState } from 'react';
import { addMember } from '@/app/actions';
import { useToast } from './ToastProvider';
import { Plus, ChevronDown, Loader2 } from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface AddToTeamButtonProps {
  userEmail: string;
  currentTeamIds: string[];
  teams: Team[];
  onAdded: () => void;
}

export default function AddToTeamButton({ userEmail, currentTeamIds, teams, onAdded }: AddToTeamButtonProps) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Only offer teams the user isn't already in.
  const availableTeams = teams.filter(t => !currentTeamIds.includes(t.id));
  if (availableTeams.length === 0) return null;

  const handleAdd = async (teamId: string, teamName: string) => {
    setLoading(true);
    setShowMenu(false);
    try {
      const result = await addMember(teamId, userEmail);
      if (result?.error) {
        toastError(result.error);
      } else {
        success(`Added to ${teamName}`);
        onAdded();
      }
    } catch {
      toastError('Failed to add to team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className={`flex items-center gap-1 px-2 py-0.5 border border-dashed border-secondary/40 text-secondary rounded-full text-[9px] font-black uppercase tracking-tighter transition-all hover:bg-secondary/10 hover:border-secondary cursor-pointer ${loading ? 'animate-pulse' : ''}`}
        title="Add to team"
      >
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} strokeWidth={3} />}
        Team
        <ChevronDown size={10} className={`transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      {showMenu && (
        <div className="absolute top-full left-0 mt-1 min-w-[140px] bg-background border border-primary/20 rounded-lg shadow-2xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
          {availableTeams.map(t => (
            <button
              key={t.id}
              onClick={() => handleAdd(t.id, t.name)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all text-left text-text hover:bg-primary/5"
            >
              <Plus size={12} className="text-secondary" />
              {t.name}
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
