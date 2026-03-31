'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';

export default function RealTimeProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    useEffect(() => {
        // Connect to your NestJS backend on port 3001 (not 3000)
        const socket = io('http://localhost:3001');

        // Listen for the "statusChanged" event from the backend
        socket.on('statusChanged', (data) => {
            console.log('Pulse update received!', data);

            // This is a Next.js trick: it tells the server to re-fetch 
            // the data without a full page reload.
            router.refresh();
        });

        return () => {
            socket.disconnect();
        };
    }, [router]);

    return <>{children}</>;
}