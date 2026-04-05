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

export default function DashboardShell({ pulseContent }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb'>('pulse');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('');
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [teamId, setTeamId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/teams')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const seedTeam = data.find((t: any) => t.id === 'seed-team-id');
          setTeamId(seedTeam ? seedTeam.id : data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + K -> Open command palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdkOpen(true);
      }
      // Pressing 'c' outside inputs to create task
      if (e.key.toLowerCase() === 'c' && !isCmdkOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setActiveView('tasks');
        // A full implementation would pop open a strictly "New Task" modal here.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCmdkOpen]);

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
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
