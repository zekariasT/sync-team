'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

// Live presence: the set of user IDs currently holding at least one open socket,
// kept in sync with the backend PulseGateway (presence:state snapshot on connect
// + presence:update deltas). Consumed by PresenceIndicator to render the real
// online/offline dot instead of one derived from the custom status text.
// `null` means "not known yet" (no snapshot received — socket still connecting
// or unreachable), so consumers can render a neutral state instead of falsely
// asserting everyone is offline.
const PresenceContext = createContext<Set<string> | null>(null);

export function usePresence() {
    return useContext(PresenceContext);
}

export default function RealTimeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { getToken, isSignedIn, isLoaded } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<Set<string> | null>(null);

    // NOTE: user sync + team auto-enroll happens in DashboardShell's init effect
    // (awaited before loading teams). It used to run here too, but two concurrent
    // /members/sync calls raced on the same teamMember insert (P2002 500s), so it
    // was consolidated into the single deterministic call in DashboardShell.

    useEffect(() => {
        // Don't open a socket until Clerk has settled on a signed-in session.
        // Connecting during the sign-out transition (or before auth loads) fires
        // the handshake with a null/expired token and logs console errors.
        if (!isLoaded || !isSignedIn) {
            setOnlineUsers(null);
            return;
        }

        let socket: ReturnType<typeof io> | undefined;
        let active = true;

        (async () => {
            // The backend authenticates the socket handshake with this token.
            const token = await getToken().catch(() => null);
            if (!active) return;

            socket = io(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}`, {
                auth: { token },
            });

            // Full presence snapshot, pushed by the server on (re)connect.
            socket.on('presence:state', (userIds: string[]) => {
                setOnlineUsers(new Set(Array.isArray(userIds) ? userIds : []));
            });

            // Incremental presence transition for a single user.
            socket.on('presence:update', ({ userId, online }: { userId: string; online: boolean }) => {
                if (!userId) return;
                setOnlineUsers((prev) => {
                    // Deltas before the first snapshot are ignored — the snapshot
                    // that follows already reflects them. No-op deltas keep the
                    // previous Set identity so consumers don't re-render.
                    if (!prev || prev.has(userId) === online) return prev;
                    const next = new Set(prev);
                    if (online) next.add(userId);
                    else next.delete(userId);
                    return next;
                });
            });

            // Listen for the "statusChanged" event from the backend (custom status
            // text — distinct from presence above).
            socket.on('statusChanged', (data) => {
                console.log('Pulse update received!', data);
                // This tells Next.js to re-fetch the data without a full page reload.
                router.refresh();
            });
            // NOTE: KB "kb:indexed" events are handled in KnowledgeBaseView, which
            // joins the team room (socket.emit('joinTeam', teamId)) to receive them.
        })();

        return () => {
            active = false;
            socket?.disconnect();
        };
    }, [router, getToken, isSignedIn, isLoaded]);

    return <PresenceContext.Provider value={onlineUsers}>{children}</PresenceContext.Provider>;
}
