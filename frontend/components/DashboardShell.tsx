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
import { Hash, Menu, X, Info, ArrowRight, ShieldCheck, Zap, Bot, Shield } from 'lucide-react';

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
    const userId = user?.id || 'guest-demo-user';
    
    async function loadTeams() {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams`, {
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
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-background text-primary/40 p-6">
               <Shield size={48} className="mb-4 opacity-20" />
               <p className="text-sm font-mono uppercase tracking-widest">ACCESS_RESTRICTED_FOR_DEMO</p>
            </div>
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

      {/* Floating Technical Overview Button */}
      <button 
        onClick={() => setIsOverviewOpen(true)}
        className="fixed bottom-6 right-6 bg-primary/10 hover:bg-primary/20 backdrop-blur-md border border-primary/20 text-primary p-3 rounded-full shadow-2xl transition-all z-40 group flex items-center gap-2"
        title="Technical Overview"
      >
        <Info size={20} className="group-hover:text-secondary transition-colors" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-sm font-bold opacity-0 group-hover:opacity-100 pr-1">Architecture</span>
      </button>

      {/* Technical Overview Modal */}
      {isOverviewOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-primary/20 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden relative flex flex-col mx-auto">
            <div className="p-6 border-b border-primary/10 flex justify-between items-center bg-primary/5">
              <h2 className="text-xl font-black tracking-tighter text-text">TECHNICAL OVERVIEW</h2>
              <button onClick={() => setIsOverviewOpen(false)} className="text-primary/50 hover:text-text transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 md:p-10 bg-linear-to-b from-background to-primary/5 overflow-y-auto flex-1">
              <div className="text-center mb-10">
                <p className="text-primary/70 text-sm max-w-xl mx-auto">
                  SyncPoint OS uses a modern microservices architecture designed for real-time collaboration, security, and AI enrichment.
                </p>
              </div>

              {/* Architecture Flow */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 relative">
                
                {/* Node 1: Auth */}
                <div className="flex flex-col items-center gap-3 w-48 text-center p-5 bg-background border border-primary/20 rounded-2xl shadow-xl z-10">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-2 mx-auto ring-1 ring-blue-500/30">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="font-bold text-sm">Identity</h3>
                  <p className="text-[10px] text-primary/50 font-mono">Clerk Auth</p>
                  <p className="text-xs text-primary/60 mt-1 leading-tight">Secures requests via short-lived JWTs and manages user profiles.</p>
                </div>

                <ArrowRight className="text-primary/30 hidden md:block" size={24} />
                <div className="w-px h-6 bg-primary/30 md:hidden" />

                {/* Node 2: Real-time Gateway */}
                <div className="flex flex-col items-center gap-3 w-48 text-center p-5 bg-background border border-primary/20 rounded-2xl shadow-xl z-10 relative">
                  <div className="absolute inset-0 bg-secondary/5 rounded-2xl animate-pulse"></div>
                  <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-2 mx-auto ring-1 ring-secondary/30 relative z-10">
                    <Zap size={24} />
                  </div>
                  <h3 className="font-bold text-sm relative z-10">Pulse Gateway</h3>
                  <p className="text-[10px] text-primary/50 font-mono relative z-10">NestJS WebSockets</p>
                  <p className="text-xs text-primary/60 mt-1 leading-tight relative z-10">Broadcasts instant state changes and presence across teams.</p>
                </div>

                <ArrowRight className="text-primary/30 hidden md:block" size={24} />
                <div className="w-px h-6 bg-primary/30 md:hidden" />

                {/* Node 3: AI Engine */}
                <div className="flex flex-col items-center gap-3 w-48 text-center p-5 bg-background border border-primary/20 rounded-2xl shadow-xl z-10">
                  <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-2 mx-auto ring-1 ring-purple-500/30">
                    <Bot size={24} />
                  </div>
                  <h3 className="font-bold text-sm">AI Worker</h3>
                  <p className="text-[10px] text-primary/50 font-mono">Gemini & Pinecone</p>
                  <p className="text-xs text-primary/60 mt-1 leading-tight">Vectorizes documents for RAG and generates team summaries.</p>
                </div>

              </div>
            </div>
            <div className="p-4 bg-background border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-primary/30 text-center md:text-left">
              <span>Frontend: Vercel (Next.js)</span>
              <span>Backend: Render (NestJS)</span>
              <span>DB: Aiven (MySQL)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
