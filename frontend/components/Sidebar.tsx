'use client';

import { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { Hash, Radio, Plus, MessageSquare, Users, ChevronDown, ChevronRight, Video, Database, Settings, LogOut } from 'lucide-react';
import AiSummaryPanel from './AiSummaryPanel';

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
  activeView: 'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb';
  onViewChange: (view: 'pulse' | 'chat' | 'videos' | 'tasks' | 'cycles' | 'roadmap' | 'kb') => void;
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}

export default function Sidebar({ activeView, onViewChange, activeChannelId, onChannelSelect }: SidebarProps) {
  const { user } = useUser();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [showNewChannel, setShowNewChannel] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { signOut, openUserProfile } = useClerk();

  useEffect(() => {
    // Fetch teams the user belongs to
    fetch('http://localhost:3001/members')
      .then(res => res.json())
      .then(() => {
        // For now, we'll fetch all teams. In production, this would be scoped.
        fetch('http://localhost:3001/teams')
          .then(res => res.ok ? res.json() : [])
          .then(data => {
            setTeams(data);
            // Auto-expand all teams
            setExpandedTeams(new Set(data.map((t: Team) => t.id)));
            // Fetch channels for each team
            data.forEach((team: Team) => {
              fetch(`http://localhost:3001/chat/teams/${team.id}/channels`)
                .then(res => res.ok ? res.json() : [])
                .then(chans => {
                  setChannels(prev => [...prev.filter(c => c.teamId !== team.id), ...chans]);
                });
            });
          })
          .catch(() => setTeams([]));
      });
  }, []);

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
      const res = await fetch(`http://localhost:3001/chat/teams/${teamId}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        <h1 className="text-lg font-black tracking-tighter text-primary">SYNCPOINT_OS</h1>
        <div className="text-[10px] font-mono text-secondary mt-0.5 tracking-wider">TEAM OPERATING SYSTEM</div>
      </div>

      {/* Nav Tabs */}
      <div className="flex flex-col p-2 gap-1 border-b border-primary/15">
        <div className="text-xs font-bold text-primary/50 uppercase tracking-wider px-2 py-2">Workspace</div>
        <button
          onClick={() => onViewChange('pulse')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
            ${activeView === 'pulse' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <Radio size={16} /> Heartbeat
        </button>
        <button
          onClick={() => onViewChange('chat')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
            ${activeView === 'chat' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <MessageSquare size={16} /> Channels
        </button>
        <button
          onClick={() => onViewChange('videos')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
            ${activeView === 'videos' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <Video size={16} /> Sync Videos
        </button>
      </div>

      <div className="flex flex-col p-2 gap-1 border-b border-primary/15">
        <div className="text-xs font-bold text-primary/50 uppercase tracking-wider px-2 py-2">Linear Tasks</div>
        <button
          onClick={() => onViewChange('tasks')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
            ${activeView === 'tasks' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <div className="w-4 h-4 rounded-full border-2 border-current opacity-70" /> Board
        </button>
        <button
          onClick={() => onViewChange('cycles')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
            ${activeView === 'cycles' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <div className="flex gap-0.5 items-end h-4 w-4 opacity-70"><div className="w-1 h-2 bg-current rounded-sm"/><div className="w-1 h-4 bg-current rounded-sm"/><div className="w-1 h-3 bg-current rounded-sm"/></div> Cycles
        </button>
        <button
          onClick={() => onViewChange('roadmap')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
            ${activeView === 'roadmap' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <div className="w-4 h-4 rounded-full border border-current opacity-70 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-current rounded-full" /></div> Roadmap
        </button>
        <button
          onClick={() => onViewChange('kb')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-all
            ${activeView === 'kb' 
              ? 'bg-secondary/10 text-secondary' 
              : 'text-primary/70 hover:text-text hover:bg-primary/5'}`}
        >
          <Database size={16} className="opacity-70" /> Knowledge Base
        </button>
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
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary/70 hover:text-primary uppercase tracking-wider transition-colors"
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
                          onClick={() => onChannelSelect(channel.id)}
                          className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-all rounded-r-lg
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
                        className="w-full flex items-center gap-2 px-4 py-1.5 text-xs text-primary/40 hover:text-secondary transition-colors"
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
      {teams.length > 0 && (
        <div className="px-3 py-2 border-t border-primary/15">
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
            <div className="absolute top-[100%] left-2 right-2 mb-2 bg-background border border-primary/15 rounded-xl shadow-2xl p-1 z-50 overflow-hidden backdrop-blur-md">
              <button 
                onClick={() => { setShowUserMenu(false); openUserProfile(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-text hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Settings size={14} className="text-primary/50" />
                Manage Account
              </button>
              <button 
                onClick={() => { setShowUserMenu(false); signOut(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/5 rounded-lg transition-colors"
              >
                <LogOut size={14} className="text-accent/50" />
                Sign Out
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 p-1.5 hover:bg-primary/5 rounded-xl transition-all group"
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
