import MemberClock from '@/components/MemberClock';
import { currentUser, auth } from '@clerk/nextjs/server';
import PulseForm from './PulseForm';
import MemberRoleBadge from './MemberRoleBadge';
import RootBadge from './RootBadge';

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
    <div className="flex-1 h-screen overflow-y-auto bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/70 border-b border-primary/15 h-14 flex items-center justify-between pl-6 pr-48">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px] shadow-green-500" />
          </div>
          <h2 className="font-display text-lg font-bold tracking-tight text-text">Team Pulse</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-full">
            {members.length} Online
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-primary/40">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> Live Feed
        </div>
      </header>

      {/* Member Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((member: any) => {
            const isTargetMemberInLeadedTeam = member.teamMembers?.some((tm: any) => leadTeamIds.includes(tm.teamId));
            const canUpdate = isAdmin || activeUserId === member.id || isTargetMemberInLeadedTeam;

            return (
              <div
                key={member.id}
                className="member-card bg-primary/5 border border-primary/15 p-5 rounded-xl group flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
                          {member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-text">{member.name}</h2>
                          {member.isRoot && <RootBadge />}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.teamMembers?.map((tm: any) => (
                            <div key={`${member.id}-${tm.teamId}`} className="flex items-center gap-1 bg-secondary/10 px-2 py-0.5 rounded-full text-[10px] font-bold text-secondary">
                              <span className="opacity-70 truncate max-w-[60px]">{tm.team?.name}</span>
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
                      </div>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full shadow-[0_0_8px] mt-2 ${
                        member.status?.toLowerCase() === 'offline'
                          ? 'bg-accent shadow-accent'
                          : 'bg-green-500 shadow-green-500'
                      }`}
                    />
                  </div>
                  <p className="text-primary mt-3 italic text-sm font-medium ml-12 border-l-2 border-primary/20 pl-4 py-1">
                    "{member.status}"
                  </p>

                  {canUpdate && <PulseForm memberId={member.id} />}
                </div>
                <div className="mt-4 pt-3 border-t flex justify-between items-center border-primary/10 text-[10px] font-mono text-primary/40 ml-12">
                  TZ: {member.timezone}
                  <MemberClock timezone={member.timezone} />
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="text-center py-20">
            <p className="text-primary/40 text-sm">No team members found.</p>
            <p className="text-primary/30 text-xs mt-1">Sign in and sync your profile to appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
