"use client";

import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

export default function MemberClock({ timezone }: { timezone: string }) {
    const  [time, setTime] = useState('--:--')
    
    useEffect(() => {
        const updateTime = () => {
            const localTime = DateTime.now().setZone(timezone).toLocaleString(DateTime.TIME_SIMPLE)
            setTime(localTime);
        };


        updateTime();

        const interval = setInterval(updateTime, 60000);

        return () => clearInterval(interval);

    }, [timezone])

    return <span className="font-mono text-cyan-400">{time}</span>;
    
}