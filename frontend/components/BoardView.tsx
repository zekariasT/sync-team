'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Plus, CheckCircle2 } from 'lucide-react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  pointerWithin,
  closestCenter,
  getFirstCollision,
  TouchSensor, 
  MouseSensor, 
  useSensor, 
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ViewHeader from './ViewHeader';
import TaskModal from './TaskModal';
import { useTeamRole } from '@/hooks/useTeamRole';
import { useToast } from './ToastProvider';

interface Task {
  id: string;
  title: string;
  state: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  assignee?: { name: string; id: string };
  reporter?: { name: string; id: string };
}

const STATE_COLORS: Record<string, string> = {
  TODO: 'bg-primary/30',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-emerald-500',
};

function SortableTask({ task, onClick, isOverlay = false }: { task: Task; onClick?: () => void; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.25 : 1,
  };

  const person = task.assignee || task.reporter;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-background border ${
        isOverlay 
          ? 'border-secondary shadow-2xl rotate-1 scale-105' 
          : isDragging 
            ? 'border-primary/10' 
            : 'border-primary/20 hover:border-secondary/40'
      } p-3 rounded-lg shadow-sm group relative select-none cursor-grab active:cursor-grabbing transition-colors`}
    >
      {/* Status dot */}
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${STATE_COLORS[task.state] || 'bg-primary/30'}`} />
        <p className="font-semibold text-sm text-text leading-snug">{task.title}</p>
      </div>
      
      <div className="flex items-center justify-between mt-2">
        {person ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-secondary/20 border border-secondary/30 text-[9px] flex items-center justify-center font-bold text-secondary">
              {person.name.charAt(0)}
            </div>
            <span className="text-[10px] text-primary/50 truncate max-w-[90px]">{person.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-dashed border-primary/20 text-[9px] flex items-center justify-center text-primary/20">?</div>
        )}
        <span className="text-[10px] text-primary/20 font-mono">#{task.id.substring(task.id.length - 4)}</span>
      </div>
    </div>
  );
}

function DroppableColumn({ status, tasks, onTaskClick }: { status: string; tasks: Task[]; onTaskClick: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  
  return (
    <div 
      ref={setNodeRef}
      className={`w-[85vw] md:w-80 flex flex-col bg-primary/5 rounded-xl border-2 shrink-0 p-3 h-full transition-colors ${isOver ? 'border-secondary/50 bg-secondary/5' : 'border-transparent bg-primary/5'}`}
    >
      <h3 className="font-bold text-sm mb-3 px-1 text-primary/70 flex items-center justify-between">
        <span>{status.replace('_', ' ')}</span>
        <span className="text-xs opacity-50 font-normal bg-primary/10 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </h3>
      
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <SortableContext id={status} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
           <div className="min-h-[150px] flex flex-col gap-2 pb-10">
             {tasks.map(task => (
               <SortableTask key={task.id} task={task} onClick={() => onTaskClick(task)} />
             ))}
             {tasks.length === 0 && !isOver && (
               <div className="flex-1 flex items-center justify-center border border-dashed border-primary/10 rounded-lg p-4 opacity-30 text-[10px] uppercase tracking-widest font-bold">
                 Empty
               </div>
             )}
           </div>
        </SortableContext>
      </div>
    </div>
  );
}

export default function BoardView({ teamId, onMenuClick }: { teamId?: string; onMenuClick?: () => void }) {
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const { role, isAdmin, isLead } = useTeamRole(teamId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const columns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  useEffect(() => {
    if (teamId) {
      fetchTasks();
      fetchMembers();
      fetchProjects();
      fetchCycles();
    }
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

  const fetchCycles = async () => {
    if (!teamId || !user) return;
    try {
      const res = await fetch(`http://localhost:3001/tasks/teams/${teamId}/cycles`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) setCycles(await res.json());
    } catch(err) { console.error(err); }
  };

  const fetchMembers = async () => {
    if (!teamId || !user) return;
    try {
      const res = await fetch(`http://localhost:3001/teams/${teamId}`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        const team = await res.json();
        setMembers(team.members || []);
      }
    } catch(err) { console.error('Failed to fetch members', err); }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`http://localhost:3001/tasks/teams/${teamId}/tasks`, {
        headers: { 'x-user-id': user?.id || '' }
      });
      if (res.ok) setTasks(await res.json());
    } catch(err) { console.error(err); }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Determine target column and position
    let newStatus = activeTask.state;
    
    // Check if dropped over a column or another task
    if (columns.includes(overId as any)) {
      newStatus = overId as Task['state'];
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) newStatus = overTask.state;
    }

    if (activeTask.state !== newStatus) {
      setTasks(prev => prev.map(t => t.id === activeId ? { ...t, state: newStatus } : t));
      try {
        const res = await fetch(`http://localhost:3001/tasks/${activeId}/state`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user?.id || ''
          },
          body: JSON.stringify({ state: newStatus })
        });
        if (!res.ok) {
           const errText = await res.text();
           throw new Error(errText || 'Failed to move task');
        }
        success(`Task moved to ${newStatus.replace('_', ' ')}`);
      } catch(err: any) {
        toastError(err.message || 'Failed to move task');
        fetchTasks();
      }
    }
  };

  const handleModalSubmit = async (data: { title: string; description: string; assigneeId?: string; projectId?: string; cycleId?: string }) => {
    if (!teamId) return;

    try {
      const url = editingTask 
        ? `http://localhost:3001/tasks/${editingTask.id}`
        : `http://localhost:3001/tasks/teams/${teamId}/tasks`;
      
      const method = editingTask ? 'PATCH' : 'POST';

      const body = editingTask 
        ? JSON.stringify(data)
        : JSON.stringify({ 
            ...data,
            reporterId: user?.id || '', 
            state: 'TODO' 
          });

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body
      });

      if (!res.ok) throw new Error(await res.text());
      
      success(`Task ${editingTask ? 'updated' : 'created'} successfully`);
      fetchTasks();
      setIsModalOpen(false);
      setEditingTask(null);
    } catch(err: any) { 
      toastError(err.message || `Failed to ${editingTask ? 'update' : 'create'} task`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden h-full">
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }} 
        onSubmit={handleModalSubmit} 
        members={members}
        projects={projects}
        cycles={cycles}
        canAssign={isAdmin || isLead}
        initialData={editingTask}
      />
      
      <ViewHeader 
        title="Board" 
        Icon={CheckCircle2} 
        onMenuClick={onMenuClick || (() => {})}
      >
        {(isAdmin || isLead) && (
          <button 
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="bg-secondary text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-secondary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">New Task</span>
          </button>
        )}
      </ViewHeader>

      <div className="flex-1 overflow-x-auto p-4 md:p-6 custom-scrollbar">
        <DndContext 
          sensors={sensors} 
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {columns.map(status => (
              <DroppableColumn 
                key={status} 
                status={status} 
                tasks={tasks.filter(t => t.state === status)} 
                onTaskClick={(task) => {
                  setEditingTask(task);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
          
          <DragOverlay adjustScale={false} dropAnimation={null}>
            {activeTask ? (
              <div style={{ width: '320px' }}>
                <SortableTask task={activeTask} isOverlay={true} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
