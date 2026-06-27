'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Users, Search, Mail, Trash2, X, Plus, Menu, Loader2 } from 'lucide-react';
import MemberRoleBadge from './MemberRoleBadge';
import RootBadge from './RootBadge';
import AddToTeamButton from './AddToTeamButton';
import { addMember, removeMember, deleteUserSystem } from '@/app/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

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
  isRoot?: boolean;
  teamMembers: TeamMember[];
}

interface Team {
  id: string;
  name: string;
}

interface UserManagementViewProps {
  onMenuClick?: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://syncpoint-backend.onrender.com';

export default function UserManagementView({ onMenuClick }: UserManagementViewProps) {
  const { user: currentUser } = useUser();
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { 'x-user-id': currentUser.id, Authorization: `Bearer ${token}` };
      const [usersRes, teamsRes] = await Promise.all([
        fetch(`${API}/members`, { headers }),
        fetch(`${API}/teams`, { headers }),
      ]);
      if (usersRes.ok && teamsRes.ok) {
        setUsers(await usersRes.json());
        setTeams(await teamsRes.json());
      }
    } catch (err) {
      console.error('Failed to load management data:', err);
      toast.error('Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, getToken]);

  // Only a root user may grant/revoke the ADMIN role.
  const currentIsRoot = users.find((u) => u.id === currentUser?.id)?.isRoot ?? false;

  const handleRemoveMember = async (teamId: string, userId: string) => {
    const res = await removeMember(teamId, userId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success('User removed from team');
      loadData();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const res = await deleteUserSystem(userId);
    if (res?.error) toast.error(res.error);
    else {
      toast.success('User deleted from system');
      loadData();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const searchBox = (
    <InputGroup className="w-full md:w-72">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Search users…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search users"
      />
    </InputGroup>
  );

  const teamRoles = (u: User) =>
    u.isRoot ? (
      <Badge variant="outline" className="border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
        Global superuser — all teams
      </Badge>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        {u.teamMembers.length > 0 ? (
          u.teamMembers.map((tm) => (
            <div
              key={`${tm.teamId}-${u.id}`}
              className="flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pl-2 pr-1"
            >
              <span className="max-w-20 truncate text-xs font-medium text-muted-foreground">
                {teams.find((t) => t.id === tm.teamId)?.name || 'Unknown'}
              </span>
              <MemberRoleBadge
                memberId={u.id}
                teamId={tm.teamId}
                role={tm.role}
                canEdit
                canGrantAdmin={currentIsRoot}
                onChanged={loadData}
              />
              <ConfirmAction
                title="Remove from team?"
                description={`Remove ${u.name} from ${teams.find((t) => t.id === tm.teamId)?.name || 'this team'}? They lose access to that team's workspace.`}
                confirmLabel="Remove"
                onConfirm={() => handleRemoveMember(tm.teamId, u.id)}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 rounded-full text-muted-foreground hover:text-destructive"
                    aria-label="Remove from team"
                  >
                    <X />
                  </Button>
                }
              />
            </div>
          ))
        ) : (
          <Badge variant="destructive">No teams</Badge>
        )}
        <AddToTeamButton
          userEmail={u.email}
          currentTeamIds={u.teamMembers.map((tm) => tm.teamId)}
          teams={teams}
          onAdded={loadData}
        />
      </div>
    );

  const deleteUserControl = (u: User) =>
    currentIsRoot && !u.isRoot ? (
      <ConfirmAction
        destructive
        title="Delete user from the entire system?"
        description={`This permanently deletes ${u.name} (${u.email}) from every team and the platform. This cannot be undone.`}
        confirmLabel="Delete permanently"
        onConfirm={() => handleDeleteUser(u.id)}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${u.name} from system`}
            title="Delete user from system"
          >
            <Trash2 />
          </Button>
        }
      />
    ) : null;

  return (
    <div className="relative h-screen flex-1 overflow-y-auto">
      {/* Mobile header */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 pl-2 pr-48 backdrop-blur md:hidden">
        {onMenuClick && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open navigation menu">
            <Menu />
          </Button>
        )}
        <h1 className="truncate text-sm font-bold tracking-tight">User Management</h1>
        <div className="ml-auto">
          <AddMemberDialog teams={teams} onAdded={loadData} compact />
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* Desktop header (pr-48 keeps the toolbar clear of the global account pill) */}
        <div className="mb-8 hidden flex-col justify-between gap-4 md:flex md:flex-row md:items-center md:pr-48">
          <div>
            <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight">
              <Users className="size-7 text-primary" /> User Management
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage team members, roles, and access permissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {searchBox}
            <AddMemberDialog teams={teams} onAdded={loadData} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="mb-4 md:hidden">{searchBox}</div>

        {loading && users.length === 0 ? (
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No users found</EmptyTitle>
                <EmptyDescription>
                  {search ? 'No users match your search.' : 'Add your first team member to get started.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </Card>
        ) : (
          <>
            {/* Desktop: table */}
            <Card className="hidden overflow-hidden py-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Teams &amp; Roles</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={u.name} seed={u.id} isRoot={u.isRoot} className="size-10" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">{u.name}</p>
                              {u.isRoot && <RootBadge />}
                            </div>
                            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                              <Mail className="size-3" /> {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{teamRoles(u)}</TableCell>
                      <TableCell className="text-right">{deleteUserControl(u)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile: card list */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar name={u.name} seed={u.id} isRoot={u.isRoot} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{u.name}</p>
                        {u.isRoot && <RootBadge />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {deleteUserControl(u)}
                  </div>
                  {teamRoles(u)}
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function AddMemberDialog({
  teams,
  onAdded,
  compact = false,
}: {
  teams: Team[];
  onAdded: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !teamId) return;
    setAdding(true);
    try {
      const res = await addMember(teamId, email);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('User added to team');
        setOpen(false);
        setEmail('');
        setTeamId('');
        onAdded();
      }
    } catch {
      toast.error('Failed to add user');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button size="icon" aria-label="Add member">
            <Plus />
          </Button>
        ) : (
          <Button>
            <Plus data-icon="inline-start" /> Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add to team</DialogTitle>
            <DialogDescription>Invite an existing user to one of your teams.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="member-email">User email</FieldLabel>
              <Input
                id="member-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="member-team">Team</FieldLabel>
              <Select value={teamId} onValueChange={setTeamId} required>
                <SelectTrigger id="member-team" className="w-full">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={adding || !email || !teamId}>
              {adding ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />}
              Add Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
