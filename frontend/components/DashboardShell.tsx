'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import VideosView from '@/components/VideosView';
import { Hash } from 'lucide-react';

interface DashboardShellProps {
  pulseContent: React.ReactNode;
}

export default function DashboardShell({ pulseContent }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<'pulse' | 'chat' | 'videos'>('pulse');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('');
  
  // We'll just hardcode teamId for MVP since we don't have a team selector in the shell
  const teamId = "cm7q0v8t0000108jsnwe8v8w2"; // Let's try to get teamId from channels or state, but wait, the sidebar has teams. We could also just let videos view fetch all teams videos if we want. Wait... what if we just pass a hardcoded mock teamId for the MVP or fetch the first team?

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
    setActiveView('chat');
  };

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
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
      ) : activeChannelId ? (
        <ChatArea channelId={activeChannelId} channelName={activeChannelName || undefined} />
      ) : (
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
      )}
    </div>
  );
}
