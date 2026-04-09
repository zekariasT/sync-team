'use client';

import { useState, useEffect } from 'react';
import { Route, Plus, FolderKanban } from 'lucide-react';
import { useUser, useAuth } from '@clerk/nextjs';
import ViewHeader from './ViewHeader';
import CreateProjectModal from './CreateProjectModal';
import { useTeamRole } from '@/hooks/useTeamRole';
import { useToast } from './ToastProvider';
import TaskModal from './TaskModal';

export default function RoadmapView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { success, error: toastError } = useToast();
  const { isAdmin, isLead } = useTeamRole(teamId);
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);

  useEffect(() => {
    if (teamId) {
      fetchProjects();
      fetchCycles();
      fetchMembers();
    }
  }, [teamId]);

  const fetchCycles = async () => {
    if (!teamId) return;
    const userId = user?.id || 'guest-demo-user';
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/teams/${teamId}/cycles`, {
        headers: { 
          'x-user-id': userId,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) setCycles(await res.json());
    } catch(err) { console.error(err); }
  };

  const fetchMembers = async () => {
    if (!teamId) return;
    const userId = user?.id || 'guest-demo-user';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams/${teamId}`, {
        headers: { 'x-user-id': userId }
      });
      if (res.ok) {
        const team = await res.json();
        setMembers(team.members || []);
      }
    } catch(err) { console.error(err); }
  };

  const fetchProjects = async () => {
    if (!teamId) return;
    const userId = user?.id || 'guest-demo-user';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/teams/${teamId}/projects`, {
        headers: { 'x-user-id': userId }
      });
      if (res.ok) setProjects(await res.json());
    } catch(err) { console.error(err); }
  };

  const handleCreateProject = async (data: { name: string; description: string }) => {
    if (!teamId) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/teams/${teamId}/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'guest-demo-user'
        },
        body: JSON.stringify({ 
          name: data.name, 
          description: data.description 
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to create project' }));
        throw new Error(errorData.message || 'Failed to create project');
      }
      
      success('Project created successfully');
      fetchProjects();
      setIsModalOpen(false);
    } catch(err: any) {
      toastError(err.message || 'Failed to create project');
    }
  };

  const handleTaskSubmit = async (data: any) => {
    if (!editingTask) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'guest-demo-user'
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(errorData.message || 'Failed to update task');
      }
      success('Task updated successfully');
      fetchProjects();
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch(err: any) {
      toastError(err.message || 'Failed to update task');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
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
        title="Roadmap" 
        Icon={Route}
        onMenuClick={onMenuClick || (() => {})}
      >
        {(isAdmin || isLead) && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-secondary text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-secondary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Project</span>
          </button>
        )}
      </ViewHeader>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full max-w-5xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-6 w-full">
          {projects.length === 0 ? (
            <div className="text-center py-20 bg-primary/5 rounded-xl border border-primary/10 border-dashed">
              <Route size={48} className="mx-auto text-primary/30 mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-text mb-2">No active projects</h3>
              <p className="text-sm text-primary/50">Chart out your long-term goals and epics.</p>
            </div>
          ) : (
            projects.map(project => (
              <div 
                key={project.id} 
                className={`border rounded-xl p-5 transition-all cursor-pointer flex gap-4 items-start relative overflow-hidden group ${
                  expandedProjectId === project.id 
                    ? 'border-secondary/40 bg-secondary/5 ring-1 ring-secondary/20 shadow-lg' 
                    : 'border-primary/20 hover:border-secondary/30 bg-primary/5'
                }`}
                onClick={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
              >
                <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-xl transition-all duration-300 ${
                  expandedProjectId === project.id ? 'bg-secondary' : 'bg-secondary/40'
                }`}></div>
                <div className="w-12 h-12 rounded-lg bg-background border border-primary/20 flex items-center justify-center shrink-0 shadow-sm text-secondary">
                   <FolderKanban size={24} />
                </div>
                <div className="flex-1">
                  {(() => {
                    const totalTasks = project.tasks?.length || 0;
                    const doneTasks = project.tasks?.filter((t: any) => t.state === 'DONE').length || 0;
                    const percentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                    return (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg">{project.name}</h3>
                          <span className="text-xs font-mono bg-background border border-primary/10 px-2 py-1 rounded text-primary/70 shadow-sm">
                            {totalTasks} Tasks
                          </span>
                        </div>
                        {project.description && (
                          <p className="text-sm text-primary/60 mb-4 leading-relaxed">{project.description}</p>
                        )}
                        
                        <div className="w-full bg-background rounded-full h-2.5 mb-1 overflow-hidden border border-primary/10">
                          <div 
                            className="bg-secondary h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] text-right font-bold text-secondary uppercase tracking-widest">{percentage}% Completed</div>

                        {expandedProjectId === project.id && (
                          <div className="mt-6 space-y-2 border-t border-secondary/10 pt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                             {project.tasks && project.tasks.length > 0 ? (
                               project.tasks.map((task: any) => (
                                 <div 
                                   key={task.id} 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setEditingTask(task);
                                     setIsTaskModalOpen(true);
                                   }}
                                   className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-primary/10 hover:border-secondary/20 transition-all hover:translate-x-1 duration-200 cursor-pointer group"
                                 >
                                   <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        task.state === 'DONE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 
                                        task.state === 'TODO' ? 'bg-primary/30' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                                      }`} />
                                      <span className="text-sm font-medium text-text">{task.title}</span>
                                   </div>
                                   <span className="text-[10px] uppercase font-black tracking-tighter text-primary/20 bg-background px-1.5 py-0.5 rounded border border-primary/5">
                                      {task.state.replace('_', ' ')}
                                   </span>
                                 </div>
                               ))
                             ) : (
                               <div className="text-center py-8 text-xs text-primary/20 font-bold uppercase tracking-widest italic">
                                 No tasks linked to this project
                               </div>
                             )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
