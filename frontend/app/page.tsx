import MemberClock from '@/components/MemberClock';


export default async function Dashboard() {
  const res = await fetch('http://localhost:3001/members', { cache: 'no-store' });
  const members = await res.json();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <header className="flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-black tracking-tighter text-cyan-400">SYNCPOINT_OS</h1>
        <div className="text-sm font-mono text-slate-500">SYSTEM_STATUS: ACTIVE</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member: any) => (
          <div key={member.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-cyan-500/50 transition-all group">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold">{member.name}</h2>
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span>
            </div>
            <p className="text-slate-400 mt-2 italic">"{member.status}"</p>
            <div className="mt-6 pt-4 border-t flex justify-between items-center border-slate-800 text-xs font-mono text-slate-500">
              TIMEZONE: {member.timezone}
              <MemberClock timezone = {member.timezone}/>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}