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
import { Hash, Menu, X } from 'lucide-react';

interface DashboardShellProps {
  pulseContent: React.ReactNode;
}

import { useUser, useAuth } from '@clerk/nextjs';
import UserManagementView from '@/components/UserManagementView';

export default function DashboardShell({ pulseContent }: DashboardShellProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [activeView, setActiveView] = useState<'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb' | 'admin'>('pulse');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('');
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [teamId, setTeamId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    
    const userId = user.id;
    
    async function loadTeams() {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/teams`, {
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

    loadTeams().catch(err => console.error(err));
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
    <div className="flex h-screen bg-background text-text overflow-hidden">
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
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main className="flex-1 overflow-hidden relative">
          {activeView === 'pulse' ? (
            <div className="h-full overflow-y-auto">
              {/* Pulse doesn't have its own internal header yet, so we add one here */}
              <header className="h-14 border-b border-primary/15 flex items-center px-4 md:hidden bg-background shrink-0 sticky top-0 z-10">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-primary hover:text-text"
                >
                  <Menu size={20} />
                </button>
                <h1 className="ml-2 text-sm font-black tracking-tighter text-primary truncate">SYNCPOINT_OS</h1>
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
              <header className="absolute top-0 left-0 right-0 h-14 border-b border-primary/15 flex items-center px-4 md:hidden bg-background shrink-0">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-primary hover:text-text"
                >
                  <Menu size={20} />
                </button>
                <h1 className="ml-2 text-sm font-black tracking-tighter text-primary">SYNCPOINT_OS</h1>
              </header>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-center mx-auto mb-5">
                  <Hash size={32} className="text-primary/30" />
                </div>
                <h3 className="text-lg font-bold text-text mb-2 text-balance">Select a Channel</h3>
                <p className="text-sm text-primary/50 max-w-xs mx-auto text-balance">
                  Pick a channel from the sidebar to start chatting with your team.
                </p>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
