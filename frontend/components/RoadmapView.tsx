'use client';

import { useState, useEffect } from 'react';
import { Route, Plus, FolderKanban } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import ViewHeader from './ViewHeader';
import CreateProjectModal from './CreateProjectModal';
import { useTeamRole } from '@/hooks/useTeamRole';
import { useToast } from './ToastProvider';

export default function RoadmapView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const { isAdmin, isLead } = useTeamRole(teamId);
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (teamId) fetchProjects();
  }, [teamId]);

  const fetchProjects = async () => {
    if (!teamId || !user) return;
    try {
      const res = await fetch(`http://localhost:3001/tasks/teams/${teamId}/projects`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) setProjects(await res.json());
    } catch(err) { console.error(err); }
  };

  const handleCreateProject = async (data: { name: string; description: string }) => {
    if (!teamId) return;

    try {
      const res = await fetch(`http://localhost:3001/tasks/teams/${teamId}/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ 
          name: data.name, 
          description: data.description 
        })
      });
      if (!res.ok) throw new Error(await res.text());
      
      success('Project created successfully');
      fetchProjects();
      setIsModalOpen(false);
    } catch(err: any) {
      toastError(err.message || 'Failed to create project');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
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
              <div key={project.id} className="border border-primary/20 rounded-xl p-5 hover:border-secondary/50 transition-colors bg-primary/5 flex gap-4 items-start relative overflow-hidden group">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-secondary/80 rounded-l-xl"></div>
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
