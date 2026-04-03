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
import { Hash } from 'lucide-react';

interface DashboardShellProps {
  pulseContent: React.ReactNode;
}

export default function DashboardShell({ pulseContent }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb'>('pulse');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('');
  const [isCmdkOpen, setIsCmdkOpen] = useState(false);
  const [teamId, setTeamId] = useState<string>('');

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
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        activeChannelId={activeChannelId}
        onChannelSelect={handleChannelSelect}
      />

      {/* Main Content */}
      {activeView === 'pulse' ? (
        <>{pulseContent}</>
      ) : activeView === 'videos' ? (
        <VideosView />
      ) : activeView === 'tasks' ? (
        <BoardView teamId={teamId} />
      ) : activeView === 'cycles' ? ( 
        <CycleView teamId={teamId} />
      ) : activeView === 'roadmap' ? (
        <RoadmapView teamId={teamId} />
      ) : activeView === 'kb' ? (
        <KnowledgeBaseView teamId={teamId} />
      ) : activeView === 'chat' && activeChannelId ? (
        <ChatArea channelId={activeChannelId} channelName={activeChannelName || undefined} />
      ) : activeView === 'chat' ? (
        /* No channel selected placeholder */
        <div className="flex-1 flex items-center justify-center h-screen bg-background">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-center mx-auto mb-5">
              <Hash size={32} className="text-primary/30" />
            </div>
            <h3 className="text-lg font-bold text-text mb-2">Select a Channel</h3>
            <p className="text-sm text-primary/50 max-w-xs">
              Pick a channel from the sidebar to start chatting with your team.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
