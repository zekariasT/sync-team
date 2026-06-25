'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export default function RealTimeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { getToken, isSignedIn, isLoaded } = useAuth();

    // NOTE: user sync + team auto-enroll happens in DashboardShell's init effect
    // (awaited before loading teams). It used to run here too, but two concurrent
    // /members/sync calls raced on the same teamMember insert (P2002 500s), so it
    // was consolidated into the single deterministic call in DashboardShell.

    useEffect(() => {
        // Don't open a socket until Clerk has settled on a signed-in session.
        // Connecting during the sign-out transition (or before auth loads) fires
        // the handshake with a null/expired token and logs console errors.
        if (!isLoaded || !isSignedIn) return;

        let socket: ReturnType<typeof io> | undefined;
        let active = true;

        (async () => {
            // The backend authenticates the socket handshake with this token.
            const token = await getToken().catch(() => null);
            if (!active) return;

            socket = io(`${process.env.NEXT_PUBLIC_API_URL || "https://syncpoint-backend.onrender.com"}`, {
                auth: { token },
            });

            // Listen for the "statusChanged" event from the backend
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

    return <>{children}</>;
}