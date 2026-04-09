'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';

export function useTeamRole(teamId?: string) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [role, setRole] = useState<'ADMIN' | 'LEAD' | 'MEMBER' | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      const userId = user?.id || 'guest-demo-user';
      
      setLoading(true);
      setRole(null);
      setIsGlobalAdmin(false);

      try {
        const token = await getToken();
        // Fetch all teams the user belongs to
        const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams`, {
          headers: { 
            'x-user-id': userId,
            'Authorization': `Bearer ${token}`
          }
        });
        const teams = teamsRes.ok ? await teamsRes.json() : [];
        
        // 1. Check for global ADMIN role (any team where user is ADMIN)
        const anyAdmin = teams.some((t: any) => 
          t.members?.some((m: any) => m.userId === userId && m.role === 'ADMIN')
        );
        setIsGlobalAdmin(anyAdmin);

        // 2. Check specific role for current team
        if (teamId) {
          const currentTeam = teams.find((t: any) => t.id === teamId);
          if (currentTeam) {
            const myMembership = currentTeam.members?.find((m: any) => m.userId === userId);
            if (myMembership) {
              setRole(myMembership.role);
            }
          } else {
            // If not found in user's team list, try direct fetch
            const teamRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}`, {
              headers: { 
                'x-user-id': userId,
                'Authorization': `Bearer ${token}`
              }
            });
            if (teamRes.ok) {
              const team = await teamRes.json();
              const myMembership = team?.members?.find((m: any) => m.userId === userId);
              if (myMembership) setRole(myMembership.role);
            }
          }
        }
      } catch (err) {
        console.error('[useTeamRole] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkRole();
  }, [teamId, user, getToken]);

  const isAdmin = isGlobalAdmin || role === 'ADMIN';
  const isLead = role === 'LEAD';

  return { role, loading, isAdmin, isLead, isMember: role === 'MEMBER' && !isGlobalAdmin };
}
