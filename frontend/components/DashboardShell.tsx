'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import VideosView from '@/components/VideosView';
import BoardView from '@/components/BoardView';
import CycleView from '@/components/CycleView';
import RoadmapView from '@/components/RoadmapView';
import KnowledgeBaseView from '@/components/KnowledgeBaseView';
import CommandPalette from '@/components/CommandPalette';
import NotificationsBell from '@/components/NotificationsBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Hash, Menu, X, Info } from 'lucide-react';

interface DashboardShellProps {
  pulseContent: React.ReactNode;
}

import { useUser, useAuth, useClerk, Show } from '@clerk/nextjs';
import UserManagementView from '@/components/UserManagementView';
import DrawioViewer from '@/components/DrawioViewer';
import { InitialsAvatar } from '@/components/InitialsAvatar';

export default function DashboardShell({ pulseContent }: DashboardShellProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { openUserProfile } = useClerk();
  const [activeView, setActiveView] = useState<'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb' | 'admin'>('pulse');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('');
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [teamId, setTeamId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Persistence: Load on mount
  useEffect(() => {
    const savedView = localStorage.getItem('syncpoint_active_view');
    const savedChannelId = localStorage.getItem('syncpoint_active_channel_id');
    const savedChannelName = localStorage.getItem('syncpoint_active_channel_name');

    if (savedView) setActiveView(savedView as any);
    if (savedChannelId) setActiveChannelId(savedChannelId);
    if (savedChannelName) setActiveChannelName(savedChannelName);
    
    setIsInitialized(true);
  }, []);

  // Persistence: Save on change
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('syncpoint_active_view', activeView);
    if (activeChannelId) {
      localStorage.setItem('syncpoint_active_channel_id', activeChannelId);
      localStorage.setItem('syncpoint_active_channel_name', activeChannelName);
    }
  }, [activeView, activeChannelId, activeChannelName, isInitialized]);

  useEffect(() => {
    if (!user) return;
    const u = user;
    const userId = u.id;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com";

    async function init() {
      const token = await getToken();

      // Sync (and auto-enroll) this Clerk user BEFORE loading teams, so a fresh
      // sign-in lands in a fully populated workspace without needing a refresh.
      await fetch(`${apiUrl}/members/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: u.id,
          email: u.primaryEmailAddress?.emailAddress,
          name: u.fullName || u.username || 'Unknown',
          avatar: u.imageUrl,
        }),
      }).catch(err => console.error('User sync failed:', err));

      const res = await fetch(`${apiUrl}/teams`, {
        headers: {
          'x-user-id': userId,
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const seedTeam = data.find((t: any) => t.id === 'seed-team-id');
        setTeamId(seedTeam ? seedTeam.id : data[0].id);
      }
    }

    init().catch(err => console.error(err));
  }, [user, getToken]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + K -> Open command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdkOpen(true);
      }
      // Pressing 'Alt + N' outside inputs to create task
      if (e.key.toLowerCase() === 'n' && e.altKey && !isCmdkOpen && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        setActiveView('tasks');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCmdkOpen]);

  const handleChannelSelect = (channelId: string, channelName: string) => {
    setActiveChannelId(channelId);
    setActiveChannelName(channelName);
    setActiveView('chat');
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleCommandPaletteAction = (action: string) => {
    if (action === 'create_task') setActiveView('tasks');
    if (action === 'create_cycle') setActiveView('cycles');
    if (action === 'create_channel') setActiveView('chat'); // Would normally open channel modal
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <CommandPalette 
        isOpen={isCmdkOpen} 
        onClose={() => setIsCmdkOpen(false)} 
        onSelectAction={handleCommandPaletteAction} 
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          activeView={activeView}
          onViewChange={(view) => {
            setActiveView(view);
            setIsSidebarOpen(false); // Close on mobile after selection
          }}
          activeChannelId={activeChannelId}
          onChannelSelect={handleChannelSelect}
          activeTeamId={teamId}
          onTeamChange={setTeamId}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          {activeView === 'pulse' ? (
            <div className="h-full overflow-y-auto">
              {/* Pulse doesn't have its own internal header yet, so we add one here */}
              <header className="h-14 border-b border-border flex items-center px-4 md:hidden bg-background shrink-0 sticky top-0 z-10">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                  <Menu size={20} />
                </button>
                <h1 className="ml-2 text-sm font-black tracking-tighter text-muted-foreground truncate">SYNCPOINT_OS</h1>
              </header>
              {pulseContent}
            </div>
          ) : activeView === 'videos' ? (
            <VideosView onMenuClick={() => setIsSidebarOpen(true)} teamId={teamId} />
          ) : activeView === 'tasks' ? (
            <BoardView onMenuClick={() => setIsSidebarOpen(true)} teamId={teamId} />
          ) : activeView === 'cycles' ? ( 
            <CycleView onMenuClick={() => setIsSidebarOpen(true)} teamId={teamId} />
          ) : activeView === 'roadmap' ? (
            <RoadmapView onMenuClick={() => setIsSidebarOpen(true)} teamId={teamId} />
          ) : activeView === 'kb' ? (
            <KnowledgeBaseView onMenuClick={() => setIsSidebarOpen(true)} teamId={teamId} />
          ) : activeView === 'admin' ? (
            <UserManagementView onMenuClick={() => setIsSidebarOpen(true)} />
          ) : activeView === 'chat' && activeChannelId ? (
            <ChatArea onMenuClick={() => setIsSidebarOpen(true)} channelId={activeChannelId} channelName={activeChannelName || undefined} />
          ) : activeView === 'chat' ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-background p-6">
              <header className="absolute top-0 left-0 right-0 h-14 border-b border-border flex items-center px-4 md:hidden bg-background shrink-0">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
                >
                  <Menu size={20} />
                </button>
                <h1 className="ml-2 text-sm font-black tracking-tighter text-muted-foreground">SYNCPOINT_OS</h1>
              </header>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-5">
                  <Hash size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 text-balance">Select a Channel</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto text-balance">
                  Pick a channel from the sidebar to start chatting with your team.
                </p>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Global sticky controls — visible on every view and while scrolling.
          Headers reserve pr-48 safe zone so this never overlaps action buttons. */}
      <div className="fixed right-3 z-50 flex items-center gap-2.5 rounded-full border border-border bg-background/70 px-3 py-1.5 shadow-lg shadow-black/5 backdrop-blur-md">
        <ThemeToggle />
        <Show when="signed-in">
          <span className="h-4 w-px bg-muted" />
          <NotificationsBell
            onOpenVideo={(tid) => {
              if (tid) setTeamId(tid);
              setActiveView('videos');
            }}
          />
        </Show>
        <span className="h-4 w-px bg-muted" />
        <Show when="signed-in">
          <button
            onClick={() => openUserProfile()}
            aria-label="Account settings"
            title="Account"
            className="cursor-pointer rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <InitialsAvatar
              name={user?.fullName || user?.username}
              seed={user?.id}
              tint="primary"
              className="size-7 text-xs"
            />
          </button>
        </Show>
      </div>

      {/* Floating Technical Overview Button */}
      <button
        onClick={() => setIsOverviewOpen(true)}
        className="fixed bottom-28 right-6 bg-muted hover:bg-muted backdrop-blur-md border border-border text-muted-foreground p-3 rounded-full shadow-2xl transition-all z-40 group flex items-center gap-2"
        title="Technical Overview"
      >
        <Info size={20} className="group-hover:text-brand-text transition-colors" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-sm font-bold opacity-0 group-hover:opacity-100 pr-1">Architecture</span>
      </button>

      {/* Technical Overview Modal */}
      {isOverviewOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden relative flex flex-col mx-auto">
            <div className="p-6 border-b border-border flex justify-between items-center bg-muted">
              <h2 className="text-xl font-black tracking-tighter text-foreground">TECHNICAL OVERVIEW</h2>
              <button onClick={() => setIsOverviewOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8 bg-linear-to-b from-background to-primary/5 overflow-y-auto flex-1">
              <DrawioViewer />
            </div>
            <div className="p-4 bg-background border-t border-border flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground text-center md:text-left">
              <span>Client: Next.js</span>
              <span>Services: NestJS (Core API + AI Worker)</span>
              <span>Infra: RabbitMQ · Redis · MariaDB · Pinecone</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
