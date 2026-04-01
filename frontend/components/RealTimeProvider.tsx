'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function RealTimeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, isLoaded } = useUser();

    useEffect(() => {
        if (isLoaded && user) {
            // Sync user details to backend
            fetch('http://localhost:3001/members/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    name: user.fullName || user.username || 'Unknown',
                    avatar: user.imageUrl,
                }),
            }).catch(err => console.error('Failed to sync user:', err));
        }
    }, [user, isLoaded]);

    useEffect(() => {
        // Connect to your NestJS backend on port 3001
        const socket = io('http://localhost:3001');

        // Listen for the "statusChanged" event from the backend
        socket.on('statusChanged', (data) => {
            console.log('Pulse update received!', data);
            // This tells Next.js to re-fetch the data without a full page reload.
            router.refresh();
        });

        return () => {
            socket.disconnect();
        };
    }, [router]);

    return <>{children}</>;
}