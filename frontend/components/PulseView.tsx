import { ThemeToggle } from '@/components/ThemeToggle';
import MemberClock from '@/components/MemberClock';
import { Show, UserButton } from '@clerk/nextjs';
import { currentUser, auth } from '@clerk/nextjs/server';
import PulseForm from './PulseForm';
import MemberRoleBadge from './MemberRoleBadge';

export default async function PulseView() {
  const user = await currentUser();
  let members: any[] = [];
  try {
    const { getToken } = await auth();
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/members`, { 
      cache: 'no-store',
      headers: {
        'x-user-id': user?.id || '',
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

  const currentMember = members.find(m => m.id === user?.id);
  const isAdmin = currentMember?.teamMembers?.some((tm: any) => tm.role === 'ADMIN');
  const leadTeamIds = currentMember?.teamMembers?.filter((tm: any) => tm.role === 'LEAD').map((tm: any) => tm.teamId) || [];

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-primary/15 h-14 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px] shadow-green-500 animate-pulse" />
          <h2 className="font-bold text-text">Team Pulse</h2>
          <span className="text-[10px] font-mono text-primary/40 bg-primary/5 px-2 py-0.5 rounded-full">
            {members.length} ONLINE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      {/* Member Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map((member: any) => {
            const isTargetMemberInLeadedTeam = member.teamMembers?.some((tm: any) => leadTeamIds.includes(tm.teamId));
            const canUpdate = isAdmin || user?.id === member.id || isTargetMemberInLeadedTeam;

            return (
              <div
                key={member.id}
                className="bg-primary/5 border border-primary/15 p-5 rounded-xl hover:border-primary/30 transition-all group flex flex-col justify-between"
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
                        <h2 className="text-base font-bold">{member.name}</h2>
                        {member.teamMembers?.[0] && (
                          <MemberRoleBadge 
                             memberId={member.id} 
                             teamId={member.teamMembers[0].teamId} 
                             role={member.teamMembers[0].role}
                             canEdit={isAdmin} 
                          />
                        )}
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
                  <p className="text-secondary mt-2 italic text-sm ml-12">"{member.status}"</p>

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
