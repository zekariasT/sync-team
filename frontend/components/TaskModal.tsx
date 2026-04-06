'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; assigneeId?: string; projectId?: string; cycleId?: string }) => void;
  members: any[];
  projects: any[];
  cycles: any[];
  canAssign: boolean;
  initialData?: any;
}

export default function TaskModal({ isOpen, onClose, onSubmit, members, projects, cycles, canAssign, initialData }: TaskModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [assigneeId, setAssigneeId] = useState<string>(initialData?.assigneeId || '');
  const [projectId, setProjectId] = useState<string>(initialData?.projectId || '');
  const [cycleId, setCycleId] = useState<string>(initialData?.cycleId || '');

  // Reset state when initialData changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setAssigneeId(initialData?.assigneeId || '');
      setProjectId(initialData?.projectId || '');
      setCycleId(initialData?.cycleId || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border border-primary/20 rounded-xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{initialData ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Title</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors text-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Project</label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors text-text appearance-none cursor-pointer pr-10"
                >
                  <option value="" className="bg-background text-text">No Project</option>
                  {projects?.map(p => (
                    <option key={p.id} value={p.id} className="bg-background text-text">{p.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Cycle</label>
              <div className="relative">
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  className="w-full bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors text-text appearance-none cursor-pointer pr-10"
                >
                  <option value="" className="bg-background text-text">No Cycle</option>
                  {cycles?.map(c => (
                    <option key={c.id} value={c.id} className="bg-background text-text">{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Assignee</label>
            <div className="relative">
              <select
                value={canAssign ? assigneeId : ''}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={!canAssign}
                className="w-full bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors text-text appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-background text-text">Unassigned</option>
                {canAssign && members?.map(m => (
                  <option key={m.userId} value={m.userId} className="bg-background text-text">
                    {m.user?.name || m.userId}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-primary/50 mb-1.5">Description (Optional)</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="w-full bg-primary/5 border border-primary/10 rounded-lg px-4 py-3 focus:outline-none focus:border-secondary transition-colors resize-none text-text"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold hover:bg-primary/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (title.trim()) {
                onSubmit({ 
                  title, 
                  description, 
                  assigneeId: assigneeId || undefined,
                  projectId: projectId || undefined,
                  cycleId: cycleId || undefined
                });
                setTitle('');
                setDescription('');
                setAssigneeId('');
                setProjectId('');
                setCycleId('');
              }
            }}
            disabled={!title.trim()}
            className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {initialData ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
