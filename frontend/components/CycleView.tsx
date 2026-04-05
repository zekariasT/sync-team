'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import ViewHeader from './ViewHeader';
import CreateCycleModal from './CreateCycleModal';

export default function CycleView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const [cycles, setCycles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (teamId) fetchCycles();
  }, [teamId]);

  const fetchCycles = async () => {
    try {
      const res = await fetch(`http://localhost:3001/tasks/teams/${teamId}/cycles`);
      if (res.ok) setCycles(await res.json());
    } catch(err) { console.error(err); }
  };

  const handleCreateCycle = async (data: { name: string; startDate: string; endDate: string }) => {
    if (!teamId) return;

    try {
      await fetch(`http://localhost:3001/tasks/teams/${teamId}/cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate
        })
      });
      fetchCycles();
      setIsModalOpen(false);
    } catch(err) {
      console.error('Failed to create cycle:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <CreateCycleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCycle}
      />
      
      <ViewHeader 
        title="Cycles" 
        Icon={Calendar}
        onMenuClick={onMenuClick || (() => {})}
      >
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-secondary text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-secondary/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> <span className="hidden sm:inline">New Cycle</span>
        </button>
      </ViewHeader>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {cycles.length === 0 ? (
            <div className="text-center py-20 bg-primary/5 rounded-xl border border-primary/10 border-dashed">
              <Calendar size={48} className="mx-auto text-primary/30 mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-text mb-2">No active cycles</h3>
              <p className="text-sm text-primary/50">Plan your next sprint to keep the team aligned.</p>
            </div>
          ) : (
            cycles.map(cycle => (
              <div key={cycle.id} className="border border-primary/20 rounded-xl p-5 hover:border-secondary/50 transition-colors bg-primary/5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">{cycle.name}</h3>
                  <span className="text-xs font-mono bg-background border border-primary/10 px-2 py-1 rounded text-primary/70 shadow-sm">
                    {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm font-semibold text-primary/50 mb-2">Tasks ({cycle.tasks?.length || 0})</div>
                {/* Progress bar placeholder */}
                <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-primary/10">
                  <div className="bg-secondary h-1.5 rounded-full w-1/4"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
