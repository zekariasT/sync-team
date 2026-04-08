'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Users, Shield, Star, User as UserIcon, Search, Mail, MapPin, Loader2, Plus, X, Trash2, ChevronDown } from 'lucide-react';
import MemberRoleBadge from './MemberRoleBadge';
import { addMember, removeMember, deleteUserSystem } from '@/app/actions';
import { useToast } from './ToastProvider';

interface TeamMember {
  teamId: string;
  role: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  status: string;
  timezone: string;
  teamMembers: TeamMember[];
}

interface Team {
  id: string;
  name: string;
}

export default function UserManagementView() {
  const { user: currentUser } = useUser();
  const { getToken } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Add member state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await getToken();
      
      // Fetch users
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/members`, {
        headers: { 'x-user-id': currentUser.id, 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch teams
      const teamsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/teams`, {
        headers: { 'x-user-id': currentUser.id, 'Authorization': `Bearer ${token}` }
      });

      if (usersRes.ok && teamsRes.ok) {
        setUsers(await usersRes.json());
        const teamData = await teamsRes.json();
        setTeams(teamData);
        if (teamData.length > 0) setSelectedTeamId(teamData[0].id);
      }
    } catch (err) {
      console.error('Failed to load management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [currentUser, getToken]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail || !selectedTeamId) return;
    setAdding(true);
    try {
      const res = await addMember(selectedTeamId, newMemberEmail);
      if (res?.error) {
        toastError(res.error);
      } else {
        success('User added to team successfully');
        setShowAddModal(false);
        setNewMemberEmail('');
        loadData();
      }
    } catch (err) {
      toastError('Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the team?')) return;
    try {
      const res = await removeMember(teamId, userId);
      if (res?.error) {
        toastError(res.error);
      } else {
        success('User removed from team');
        loadData();
      }
    } catch (err) {
      toastError('Failed to remove user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('EXTREME WARNING: This will delete the user from the ENTIRE system. This cannot be undone. Proceed?')) return;
    try {
      const res = await deleteUserSystem(userId);
      if (res?.error) {
        toastError(res.error);
      } else {
        success('User deleted from system');
        loadData();
      }
    } catch (err) {
      toastError('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-background p-8 relative">
      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-primary/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-primary/10 flex justify-between items-center bg-primary/5">
              <h3 className="text-xl font-black tracking-tighter text-text">Add to Team</h3>
              <button onClick={() => setShowAddModal(false)} className="text-primary/40 hover:text-text transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1.5">User Email</label>
                <input 
                  type="email" 
                  value={newMemberEmail}
                  onChange={e => setNewMemberEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary/50 transition-all text-text"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Select Team</label>
                <div className="relative group/select">
                  <select 
                    value={selectedTeamId}
                    onChange={e => setSelectedTeamId(e.target.value)}
                    className="w-full bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-secondary/50 transition-all appearance-none cursor-pointer text-text"
                    required
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id} className="bg-background text-text">
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within/select:text-secondary pointer-events-none transition-colors" />
                </div>
              </div>
              <button 
                disabled={adding}
                className="w-full bg-secondary text-background font-black uppercase tracking-widest py-3 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {adding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                Add Member
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-text mb-1 flex items-center gap-3">
              <Users className="text-secondary" /> User Management
            </h1>
            <p className="text-sm text-primary/50 font-medium">Manage team members, roles, and access permissions.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-secondary transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-primary/5 border border-primary/15 rounded-xl text-sm focus:outline-none focus:border-secondary/50 focus:ring-1 focus:ring-secondary/50 transition-all w-full md:w-64"
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-secondary text-background px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-secondary/20"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Add Member</span>
            </button>
          </div>
        </div>

        {/* User Table Card */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-primary/10 bg-primary/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary/40">User</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary/40">Teams & Roles</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-primary/40 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-secondary/40 transition-colors">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="text-secondary/50" size={20} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text truncate group-hover:text-secondary transition-colors">{u.name}</p>
                          <p className="text-xs text-primary/40 flex items-center gap-1.5 truncate">
                            <Mail size={12} className="opacity-50" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {u.teamMembers.length > 0 ? (
                          u.teamMembers.map((tm) => (
                            <div key={`${tm.teamId}-${u.id}`} className="flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-full pl-2 pr-1 py-0.5">
                                <span className="text-[10px] font-bold text-primary/40 truncate max-w-[80px]">
                                  {teams.find(t => t.id === tm.teamId)?.name || 'Unknown'}
                                </span>
                                <MemberRoleBadge 
                                  memberId={u.id}
                                  teamId={tm.teamId}
                                  role={tm.role}
                                  canEdit={true}
                                />
                                <button 
                                  onClick={() => handleRemoveMember(tm.teamId, u.id)}
                                  className="p-1 text-primary/20 hover:text-accent transition-colors rounded-full"
                                  title="Remove from team"
                                >
                                  <X size={10} strokeWidth={3} />
                                </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-full">NO TEAMS</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 text-primary/20 hover:text-accent transition-all hover:bg-accent/10 rounded-lg"
                        title="Delete User from System"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="py-20 text-center">
              <Users size={48} className="mx-auto text-primary/10 mb-4" />
              <p className="text-primary/40 font-medium">No users found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
