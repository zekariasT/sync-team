'use client';

import { useState } from 'react';
import { addMember } from '@/app/actions';
import { toast } from 'sonner';
import { Plus, ChevronDown, Loader2 } from 'lucide-react';
import { badgeVariants } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
  const [loading, setLoading] = useState(false);

  // Only offer teams the user isn't already in.
  const availableTeams = teams.filter((t) => !currentTeamIds.includes(t.id));
  if (availableTeams.length === 0) return null;

  const handleAdd = async (teamId: string, teamName: string) => {
    setLoading(true);
    try {
      const result = await addMember(teamId, userEmail);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added to ${teamName}`);
        onAdded();
      }
    } catch {
      toast.error('Failed to add to team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        aria-label="Add to team"
        className={cn(
          badgeVariants({ variant: 'outline' }),
          'cursor-pointer border-dashed border-primary/40 text-primary uppercase tracking-tight hover:bg-primary/10',
          loading && 'animate-pulse',
        )}
      >
        {loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
        Team
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        <DropdownMenuGroup>
          {availableTeams.map((t) => (
            <DropdownMenuItem key={t.id} onSelect={() => handleAdd(t.id, t.name)}>
              <Plus data-icon="inline-start" />
              {t.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
