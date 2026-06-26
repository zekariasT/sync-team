import MemberClock from '@/components/MemberClock';
import { currentUser, auth } from '@clerk/nextjs/server';
import PulseForm from './PulseForm';
import MemberRoleBadge from './MemberRoleBadge';
import RootBadge from './RootBadge';
import { Globe } from 'lucide-react';

// Deterministic avatar tint so each member keeps a stable colour across renders
// (sage / clay / amber), with root pinned to the solid primary tint.
const TINTS = ['sage', 'clay', 'amber'] as const;
function tintFor(seed: string, isRoot?: boolean) {
  if (isRoot) return 'primary';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export default async function PulseView() {
  const user = await currentUser();
  const activeUserId = user?.id || 'guest-demo-user';
  let members: any[] = [];
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/members`, {
      cache: 'no-store',
      headers: {
        'x-user-id': user?.id || 'guest-demo-user',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) {
       members = [];
    } else {
       members = await res.json();
       if (!Array.isArray(members)) members = [];
    }
  } catch {
    members = [];
  }

  const currentMember = members.find(m => m.id === activeUserId);
  const isAdmin = currentMember?.teamMembers?.some((tm: any) => tm.role === 'ADMIN');
  const isRoot = !!currentMember?.isRoot; // only root may grant/revoke ADMIN
  const leadTeamIds = currentMember?.teamMembers?.filter((tm: any) => tm.role === 'LEAD').map((tm: any) => tm.teamId) || [];

  return (
    <div className="h-screen flex-1 overflow-y-auto bg-background">
      {/* Header (pr-48 keeps the toolbar clear of the global account pill) */}
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between gap-4 border-b border-border bg-background/80 pl-6 pr-48 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="size-2.5 shrink-0 rounded-full bg-presence animate-pulse-ring" aria-hidden />
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-text">Team Pulse</h1>
            <p className="mt-0.5 text-xs text-text-muted">
              Real-time presence{members.length > 0 ? ` · ${members.length} online` : ''}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] px-3 py-1.5 sm:flex">
          <span className="size-1.5 rounded-full bg-presence" aria-hidden />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-brand-text">Live Feed</span>
        </div>
      </header>

      {/* Member Grid */}
      <div className="px-6 pb-16 pt-6">
        <div className="pulse-grid">
          {members.map((member: any) => {
            const isTargetMemberInLeadedTeam = member.teamMembers?.some((tm: any) => leadTeamIds.includes(tm.teamId));
            const canUpdate = isAdmin || activeUserId === member.id || isTargetMemberInLeadedTeam;
            const offline = member.status?.toLowerCase() === 'offline';
            const tint = tintFor(member.id ?? member.name ?? '', member.isRoot);

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[18px] shadow-card"
              >
                {/* Identity row */}
                <div className="flex items-start gap-3">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="size-[42px] shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div
                      data-tint={tint}
                      className="avatar-tint flex size-[42px] shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                    >
                      {member.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 items-center gap-2 self-stretch">
                    <h3 className="min-w-0 truncate text-[15px] font-semibold text-text">{member.name}</h3>
                    {member.isRoot && <RootBadge />}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={offline ? 'size-2 rounded-full bg-text-faint' : 'size-2 rounded-full bg-presence'}
                      style={offline ? undefined : { boxShadow: '0 0 0 3px var(--brand-soft)' }}
                      aria-hidden
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${offline ? 'text-text-faint' : 'text-brand-text'}`}>
                      {offline ? 'Offline' : 'Online'}
                    </span>
                  </div>
                </div>

                {/* Teams & roles */}
                {member.teamMembers?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {member.teamMembers.map((tm: any) => (
                      <div
                        key={`${member.id}-${tm.teamId}`}
                        className="flex items-center gap-1 rounded-full border border-border bg-surface-2 py-0.5 pl-2 pr-1"
                      >
                        <span className="max-w-[72px] truncate text-[11px] font-medium text-text-muted">{tm.team?.name}</span>
                        <MemberRoleBadge
                          memberId={member.id}
                          teamId={tm.teamId}
                          role={tm.role}
                          canEdit={isAdmin}
                          canGrantAdmin={isRoot}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Status quote */}
                <div className="flex items-stretch gap-2.5">
                  <span className="w-[3px] shrink-0 rounded-sm bg-brand opacity-55" aria-hidden />
                  <p className="m-0 text-[13.5px] font-normal italic leading-normal text-text">
                    &ldquo;{member.status}&rdquo;
                  </p>
                </div>

                {/* Custom-status form */}
                {canUpdate && <PulseForm memberId={member.id} />}

                {/* Footer: timezone + local clock */}
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
                    <Globe className="size-3 opacity-70" />
                    {member.timezone}
                  </span>
                  <MemberClock timezone={member.timezone} />
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-sm text-text-muted">No team members found.</p>
            <p className="mt-1 text-xs text-text-faint">Sign in and sync your profile to appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
