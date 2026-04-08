'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@clerk/nextjs';

export default function RealTimeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();

    useEffect(() => {
        if (isLoaded && user) {
            const syncUser = async () => {
                const token = await getToken();
                fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/members/sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        id: user.id,
                        email: user.primaryEmailAddress?.emailAddress,
                        name: user.fullName || user.username || 'Unknown',
                        avatar: user.imageUrl,
                    }),
                }).catch(err => console.error('Failed to sync user:', err));
            };
            syncUser();
        }
    }, [user, isLoaded]);

    useEffect(() => {
        // Connect to your NestJS backend on port 3001
        const socket = io(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`);

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