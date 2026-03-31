import { ThemeToggle } from '@/components/ThemeToggle';
import MemberClock from '@/components/MemberClock';
import { updatePulse } from './actions';

export default async function Dashboard() {
  const res = await fetch('http://localhost:3001/members', { cache: 'no-store' });
  const members = await res.json();

  return (
    <main className="min-h-screen bg-background text-text p-8 font-sans transition-colors duration-300">
      <header className="flex justify-between items-center mb-12 border-b border-primary/20 pb-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tighter text-primary">SYNCPOINT_OS</h1>
          <div className="text-sm font-mono text-secondary">SYSTEM_STATUS: ACTIVE</div>
        </div>
        <ThemeToggle />
      </header>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member: any) => (
          <div key={member.id} className="bg-primary/5 border border-primary/20 p-6 rounded-2xl hover:border-primary/50 transition-all group flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">{member.name}</h2>
                <span className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${member.status?.toLowerCase() === 'offline' ? 'bg-accent shadow-accent' : 'bg-green-500 shadow-green-500'}`}></span>
                </div>
                <p className="text-secondary mt-2 italic">"{member.status}"</p>

                <form action={updatePulse.bind(null, member.id)} className="mt-4 flex gap-2">
                    <input 
                        type="text" 
                        name="status" 
                        placeholder="Set custom status..." 
                        className="bg-background border border-primary/30 text-text rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-primary placeholder:text-secondary/50"
                    />
                    <button type="submit" className="bg-secondary hover:bg-primary text-background px-4 py-1.5 rounded-md text-sm font-semibold transition-colors">
                        Pulse
                    </button>
                </form>
            </div>
            <div className="mt-6 pt-4 border-t flex justify-between items-center border-primary/20 text-xs font-mono text-secondary">
              TIMEZONE: {member.timezone}
              <MemberClock timezone={member.timezone}/>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}