'use client';

import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useUser, useAuth } from '@clerk/nextjs';
import { Bell, CheckCheck, Video } from 'lucide-react';
import { useToast } from './ToastProvider';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
  videoId?: string | null;
  teamId?: string | null;
  actorId?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsBell({ onOpenVideo }: { onOpenVideo: (teamId?: string) => void }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { info } = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://syncpoint-backend.onrender.com';

  // Initial load — DB-backed, so the badge is correct on first paint / after reload.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}/notifications`, {
          headers: { 'x-user-id': user.id, 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok || !active) return;
        const data = await res.json();
        setItems(data.items ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch {
        // non-fatal — bell just stays empty
      }
    })();
    return () => { active = false; };
  }, [user, getToken, apiUrl]);

  // Live updates — the gateway auto-joins this socket to its user room on connect,
  // so tag notifications addressed to us arrive here without joining a team room.
  useEffect(() => {
    if (!user) return;
    let socket: ReturnType<typeof io> | undefined;
    let active = true;
    (async () => {
      const token = await getToken().catch(() => null);
      if (!active) return;
      socket = io(apiUrl, { auth: { token } });
      socket.on('notification:new', (n: Notification) => {
        setItems((prev) => [n, ...prev].slice(0, 30));
        setUnreadCount((c) => c + 1);
        info(n.message);
      });
    })();
    return () => { active = false; socket?.disconnect(); };
  }, [user, getToken, apiUrl, info]);

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      const token = await getToken();
      await fetch(`${apiUrl}/notifications/read-all`, {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '', 'Authorization': `Bearer ${token}` },
      });
    } catch { /* optimistic — ignore */ }
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        const token = await getToken();
        await fetch(`${apiUrl}/notifications/${n.id}/read`, {
          method: 'POST',
          headers: { 'x-user-id': user?.id || '', 'Authorization': `Bearer ${token}` },
        });
      } catch { /* optimistic — ignore */ }
    }
    setOpen(false);
    onOpenVideo(n.teamId ?? undefined);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center text-primary/70 hover:text-text transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-background border border-primary/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10 bg-primary/5">
              <span className="font-bold text-sm">Notifications</span>
              {items.some((n) => !n.isRead) && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-bold text-secondary hover:underline">
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-primary/40">No notifications yet.</div>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left flex items-start gap-2.5 px-4 py-3 border-b border-primary/5 hover:bg-primary/5 transition-colors ${n.isRead ? 'opacity-60' : ''}`}
                  >
                    <span className="mt-0.5 w-7 h-7 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                      <Video size={14} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-text leading-snug">{n.message}</span>
                      <span className="block text-[11px] text-primary/40 mt-0.5">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
