'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Hash, Radio, Plus, MessageSquare, Users, ChevronDown, ChevronRight, Video } from 'lucide-react';
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
  activeView: 'pulse' | 'chat' | 'videos';
  onViewChange: (view: 'pulse' | 'chat' | 'videos') => void;
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
    <aside className="w-64 h-screen bg-background border-r border-primary/15 flex flex-col shrink-0 overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-primary/15">
        <h1 className="text-lg font-black tracking-tighter text-primary">SYNCPOINT_OS</h1>
        <div className="text-[10px] font-mono text-secondary mt-0.5 tracking-wider">TEAM OPERATING SYSTEM</div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-primary/15">
        <button
          onClick={() => onViewChange('pulse')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-all
            ${activeView === 'pulse' 
              ? 'text-secondary border-b-2 border-secondary bg-secondary/5' 
              : 'text-primary/50 hover:text-primary hover:bg-primary/5'}`}
        >
          <Radio size={14} />
          Pulse
        </button>
        <button
          onClick={() => onViewChange('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-all
            ${activeView === 'chat' 
              ? 'text-secondary border-b-2 border-secondary bg-secondary/5' 
              : 'text-primary/50 hover:text-primary hover:bg-primary/5'}`}
        >
          <MessageSquare size={14} />
          Chat
        </button>
        <button
          onClick={() => onViewChange('videos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider transition-all
            ${activeView === 'videos' 
              ? 'text-secondary border-b-2 border-secondary bg-secondary/5' 
              : 'text-primary/50 hover:text-primary hover:bg-primary/5'}`}
        >
          <Video size={14} />
          Videos
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
        <div className="p-3 border-t border-primary/15 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary/20 overflow-hidden shrink-0">
            {user.imageUrl && <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text truncate">{user.fullName || user.username}</p>
            <p className="text-[10px] text-primary/50 truncate">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
