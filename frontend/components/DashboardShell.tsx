'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Show, UserButton, SignInButton } from '@clerk/nextjs';
import { Hash, Radio } from 'lucide-react';

interface DashboardShellProps {
  pulseContent: React.ReactNode;
}

export default function DashboardShell({ pulseContent }: DashboardShellProps) {
  const [activeView, setActiveView] = useState<'pulse' | 'chat'>('pulse');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>('');

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId);
    setActiveView('chat');
    // We'll set the name from the sidebar data
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
