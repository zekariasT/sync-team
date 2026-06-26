'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk, useAuth } from '@clerk/nextjs';
import { Hash, Activity, Plus, LayoutDashboard, Users, RotateCw, Map, BookOpen, ChevronDown, ChevronRight, Video, Settings, LogOut, Check } from 'lucide-react';
import AiSummaryPanel from './AiSummaryPanel';
import { useTeamRole } from '@/hooks/useTeamRole';

interface Channel {
  id: string;
  name: string;
  type: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
}

interface SidebarProps {
  activeView: 'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb' | 'admin';
  onViewChange: (view: 'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb' | 'admin') => void;
  activeChannelId: string | null;
  onChannelSelect: (channelId: string, channelName: string) => void;
  activeTeamId?: string;
  onTeamChange?: (teamId: string) => void;
}

export default function Sidebar({ activeView, onViewChange, activeChannelId, onChannelSelect, activeTeamId, onTeamChange }: SidebarProps) {
  const { user } = useUser();
  const { isAdmin } = useTeamRole();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [showNewChannel, setShowNewChannel] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const { signOut, openUserProfile } = useClerk();
  const { getToken } = useAuth();

  useEffect(() => {
    const userId = user?.id || 'guest-demo-user';
    
    async function loadInitialData() {
      setLoadingTeams(true);
      const token = await getToken();
      
      // Fetch teams the user belongs to
      const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/teams`, {
        headers: { 
          'x-user-id': userId,
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await (teamsRes.ok ? teamsRes.json() : []);
      
      setTeams(data);
      setLoadingTeams(false);
      // Auto-expand all teams
      setExpandedTeams(new Set(data.map((t: Team) => t.id)));
      
      // Fetch channels for each team
      data.forEach(async (team: Team) => {
        const chanRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/chat/teams/${team.id}/channels`, {
          headers: { 
            'x-user-id': userId,
            'Authorization': `Bearer ${token}`
          }
        });
        const chans = await (chanRes.ok ? chanRes.json() : []);
        setChannels(prev => [...prev.filter(c => c.teamId !== team.id), ...chans]);
      });
    }

    loadInitialData().catch(() => {
      setTeams([]);
      setLoadingTeams(false);
    });
  }, [user, getToken]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const handleCreateChannel = async (teamId: string) => {
    if (!newChannelName.trim()) return;
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}/chat/teams/${teamId}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newChannelName.trim() }),
      });
      if (res.ok) {
        const newChannel = await res.json();
        setChannels(prev => [...prev, newChannel]);
        setNewChannelName('');
        setShowNewChannel(null);
      }
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  return (
    <aside className="w-64 bg-background border-r border-primary/15 flex flex-col h-screen shadow-[4px_0_24px_rgba(33,35,40,0.5)] z-20 relative">
      {/* Logo */}
      <div className="p-4 border-b border-primary/15">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-text">
          SYNCPOINT<span className="text-secondary">_OS</span>
        </h1>
        <div className="text-[10px] font-mono text-primary/50 mt-1 tracking-[0.25em] uppercase flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500" />
          Team Operating System
        </div>
      </div>

      {/* Team Switcher — controls the active team for Board/Cycles/Roadmap/KB/Videos */}
      {onTeamChange && (
        <div className="p-2 border-b border-primary/15 relative">
          {loadingTeams ? (
            <div className="h-9 w-full bg-primary/5 animate-pulse rounded-lg border border-primary/10" />
          ) : teams.length > 0 ? (
            <>
              <button
                onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/15 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Users size={14} className="text-secondary shrink-0" />
                <span className="flex-1 text-left text-sm font-semibold text-text truncate">
                  {teams.find(t => t.id === activeTeamId)?.name || 'Select Team'}
                </span>
                <ChevronDown size={14} className={`text-primary/50 shrink-0 transition-transform ${showTeamSwitcher ? 'rotate-180' : ''}`} />
              </button>

              {showTeamSwitcher && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTeamSwitcher(false)} />
                  <div className="absolute top-full left-2 right-2 mt-1 bg-background border border-primary/15 rounded-xl shadow-2xl p-1 z-50 overflow-hidden backdrop-blur-md">
                    {teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => { onTeamChange(team.id); setShowTeamSwitcher(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-text hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="flex-1 text-left truncate">{team.name}</span>
                        {team.id === activeTeamId && <Check size={14} className="text-secondary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex flex-col p-2 gap-1 border-b border-primary/15">
        <div className="text-xs font-bold text-primary/50 uppercase tracking-wider px-2 py-2">Workspace</div>
        <button
          onClick={() => onViewChange('pulse')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer
            ${activeView === 'pulse' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <Activity size={16} /> Heartbeat
        </button>
        <button
          onClick={() => onViewChange('chat')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer
            ${activeView === 'chat' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <Hash size={16} /> Channels
        </button>
        <button
          onClick={() => onViewChange('videos')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer
            ${activeView === 'videos' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <Video size={16} /> Sync Videos
        </button>
      </div>

      <div className="flex flex-col p-2 gap-1 border-b border-primary/15">
        <div className="text-xs font-bold text-primary/50 uppercase tracking-wider px-2 py-2">Task Management</div>
        <button
          onClick={() => onViewChange('tasks')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer
            ${activeView === 'tasks' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <LayoutDashboard size={16} /> Board
        </button>
        <button
          onClick={() => onViewChange('cycles')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer
            ${activeView === 'cycles' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <RotateCw size={16} /> Cycles
        </button>
        <button
          onClick={() => onViewChange('roadmap')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer
            ${activeView === 'roadmap' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <Map size={16} /> Roadmap
        </button>
        <button
          onClick={() => onViewChange('kb')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer
            ${activeView === 'kb' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <BookOpen size={16} /> Knowledge Base
        </button>

        {isAdmin && (
          <button
            onClick={() => onViewChange('admin')}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
              ${activeView === 'admin'
                ? 'bg-secondary/10 text-secondary'
                : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
          >
            <Users size={16} /> User Management
          </button>
        )}
      </div>

      {/* Chat Channels List */}
      {activeView === 'chat' && (
        <div className="flex-1 overflow-y-auto py-2">
          {teams.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Users size={32} className="mx-auto text-primary/30 mb-3" />
              <p className="text-xs text-primary/50">No teams yet.</p>
              <p className="text-[10px] text-primary/30 mt-1">Create a team to start chatting.</p>
            </div>
          ) : (
            teams.map(team => (
              <div key={team.id}>
                {/* Team Header */}
                <button
                  onClick={() => toggleTeam(team.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary/70 hover:text-primary uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {expandedTeams.has(team.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Users size={12} />
                  {team.name}
                </button>

                {/* Channels */}
                {expandedTeams.has(team.id) && (
                  <div className="ml-2">
                    {channels
                      .filter(c => c.teamId === team.id)
                      .map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => onChannelSelect(channel.id, channel.name)}
                          className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-all rounded-r-lg cursor-pointer
                            ${activeChannelId === channel.id
                              ? 'text-text bg-secondary/15 border-l-2 border-secondary font-semibold'
                              : 'text-primary/60 hover:text-text hover:bg-primary/5 border-l-2 border-transparent'}`}
                        >
                          <Hash size={14} className="shrink-0" />
                          <span className="truncate">{channel.name}</span>
                        </button>
                      ))}

                    {/* New Channel Input */}
                    {showNewChannel === team.id ? (
                      <div className="px-4 py-1.5 flex items-center gap-1">
                        <Hash size={14} className="text-primary/30 shrink-0" />
                        <input
                          type="text"
                          value={newChannelName}
                          onChange={e => setNewChannelName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleCreateChannel(team.id);
                            if (e.key === 'Escape') { setShowNewChannel(null); setNewChannelName(''); }
                          }}
                          placeholder="channel-name"
                          autoFocus
                          className="bg-transparent border-b border-primary/30 text-sm text-text py-0.5 w-full focus:outline-none focus:border-secondary placeholder:text-primary/30"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowNewChannel(team.id)}
                        className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-primary/40 hover:text-secondary transition-colors cursor-pointer"
                      >
                        <Plus size={12} />
                        Add Channel
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* AI Summary Section */}
      {loadingTeams ? (
        <div className="px-3 py-3 border-t border-primary/15 space-y-2">
          <div className="h-9 w-full bg-primary/5 animate-pulse rounded-xl border border-primary/10" />
          <div className="h-9 w-full bg-primary/5 animate-pulse rounded-xl border border-primary/10" />
          <div className="h-9 w-full bg-primary/5 animate-pulse rounded-xl border border-primary/10" />
        </div>
      ) : teams.length > 0 && (
        <div className="flex flex-col p-2 gap-1 border-t border-primary/15">
          <div className="text-xs font-bold text-primary/50 uppercase tracking-wider px-2 py-2">Global Sync</div>
          {teams.map(team => (
            <AiSummaryPanel key={team.id} teamId={team.id} teamName={team.name} />
          ))}
        </div>
      )}

      {/* User Info Footer */}
      {user && (
        <div className="p-3 border-t border-primary/15 relative">
          {/* User Menu Drawer */}
          {showUserMenu && (
            <div className="absolute top-full left-2 right-2 bg-background border border-primary/15 rounded-xl shadow-2xl p-1 z-50 overflow-hidden backdrop-blur-md">
              <button 
                onClick={() => { setShowUserMenu(false); openUserProfile(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
              >
                <Settings size={14} className="text-primary/50" />
                Manage Account
              </button>
              <button 
                onClick={() => { setShowUserMenu(false); signOut({ redirectUrl: '/sign-in' }); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/5 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={14} className="text-accent/50" />
                Sign Out
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 p-1.5 hover:bg-primary/5 rounded-xl transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary/20 overflow-hidden shrink-0 border border-secondary/20 group-hover:border-secondary/40 transition-colors">
              {user.imageUrl && <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-text truncate leading-tight">{user.fullName || user.username}</p>
              <p className="text-[10px] text-primary/40 truncate leading-tight">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </button>
        </div>
      )}
    </aside>
  );
}
