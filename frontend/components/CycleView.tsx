'use client';

import { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import ViewHeader from './ViewHeader';
import { useUser, useAuth } from '@clerk/nextjs';
import CreateCycleModal from './CreateCycleModal';
import { useTeamRole } from '@/hooks/useTeamRole';
import { useToast } from './ToastProvider';
import TaskModal from './TaskModal';

export default function CycleView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { success, error: toastError } = useToast();
  const { isAdmin, isLead } = useTeamRole(teamId);
  const [cycles, setCycles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (teamId) {
      fetchCycles();
      fetchProjects();
      fetchMembers();
    }
  }, [teamId]);

  const fetchProjects = async () => {
    if (!teamId) return;
    const userId = user?.id || 'guest-demo-user';
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/teams/${teamId}/projects`, {
        headers: { 
          'x-user-id': userId,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) setProjects(await res.json());
    } catch(err) { console.error(err); }
  };

  const fetchMembers = async () => {
    if (!teamId) return;
    const userId = user?.id || '';
    const token = await getToken();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}`, {
        headers: { 'x-user-id': userId, 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const team = await res.json();
        setMembers(team.members || []);
      }
    } catch(err) { console.error(err); }
  };

  const fetchCycles = async () => {
    if (!teamId) return;
    const userId = user?.id || '';
    const token = await getToken();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/teams/${teamId}/cycles`, {
        headers: { 'x-user-id': userId, 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCycles(await res.json());
    } catch(err) { console.error(err); }
  };

  const handleCreateCycle = async (data: { name: string; startDate: string; endDate: string }) => {
    if (!teamId) return;

    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/teams/${teamId}/cycles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to create cycle' }));
        throw new Error(errorData.message || 'Failed to create cycle');
      }
      
      success('Cycle created successfully');
      fetchCycles();
      setIsModalOpen(false);
    } catch(err: any) {
      toastError(err.message || 'Failed to create cycle');
    }
  };

  const handleTaskSubmit = async (data: any) => {
    if (!editingTask) return;
    const userId = user?.id || 'guest-demo-user';
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(errorData.message || 'Failed to update task');
      }
      success('Task updated successfully');
      fetchCycles();
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch(err: any) {
      toastError(err.message || 'Failed to update task');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <CreateCycleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCycle}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskSubmit}
        members={members}
        projects={projects}
        cycles={cycles}
        canAssign={isAdmin || isLead}
        initialData={editingTask}
      />
      
      <ViewHeader 
        title="Cycles" 
        Icon={Calendar}
        onMenuClick={onMenuClick || (() => {})}
      >
        {(isAdmin || isLead) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Cycle</span>
          </button>
        )}
      </ViewHeader>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {cycles.length === 0 ? (
            <div className="text-center py-20 bg-muted rounded-xl border border-border border-dashed">
              <Calendar size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-foreground mb-2">No active cycles</h3>
              <p className="text-sm text-muted-foreground">Plan your next sprint to keep the team aligned.</p>
            </div>
          ) : (
            cycles.map(cycle => (
              <div 
                key={cycle.id} 
                className={`border rounded-xl p-5 transition-all cursor-pointer ${
                  expandedCycleId === cycle.id 
                    ? 'border-brand/40 bg-brand/10 ring-1 ring-brand/20 shadow-lg' 
                    : 'border-border hover:border-brand/30 bg-muted'
                }`}
                onClick={() => setExpandedCycleId(expandedCycleId === cycle.id ? null : cycle.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">{cycle.name}</h3>
                  <span className="text-xs font-mono bg-background border border-border px-2 py-1 rounded text-muted-foreground shadow-sm">
                    {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                  </span>
                </div>
                {(() => {
                  const totalTasks = cycle.tasks?.length || 0;
                  const doneTasks = cycle.tasks?.filter((t: any) => t.state === 'DONE').length || 0;
                  const percentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                  return (
                    <div className={expandedCycleId === cycle.id ? 'pb-4 mb-4 border-b border-brand/10' : ''}>
                      <div className="text-sm font-semibold text-muted-foreground mb-2 flex justify-between">
                        <span>Tasks ({totalTasks})</span>
                        <span className="text-brand-text font-mono">{percentage}%</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-1.5 overflow-hidden border border-border">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })()}

                {expandedCycleId === cycle.id && (
                  <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {cycle.tasks && cycle.tasks.length > 0 ? (
                      cycle.tasks.map((task: any) => (
                        <div 
                          key={task.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border hover:border-brand/20 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                             <div className={`w-2 h-2 rounded-full shrink-0 ${
                               task.state === 'DONE' ? 'bg-presence shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                               task.state === 'TODO' ? 'bg-muted' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                             }`} />
                             <span className="text-sm font-medium text-foreground truncate group-hover:text-brand-text transition-colors">{task.title}</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded border border-border shrink-0 ml-2">
                             {task.state.replace('_', ' ')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-muted-foreground font-bold uppercase tracking-widest italic">
                        No tasks in this cycle
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
