"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export function useTimer(durationSeconds: number, onComplete?: () => void) {
    const [timeLeft, setTimeLeft] = useState(durationSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const stop = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsRunning(false);
    }, []);

    const start = useCallback((seconds?: number) => {
        stop();
        const duration = seconds ?? durationSeconds;
        setTimeLeft(duration);
        setIsRunning(true);

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    stop();
                    onCompleteRef.current?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [durationSeconds, stop]);

    const reset = useCallback((seconds?: number) => {
        stop();
        setTimeLeft(seconds ?? durationSeconds);
    }, [durationSeconds, stop]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const progress = durationSeconds > 0 ? (timeLeft / durationSeconds) * 100 : 0;

    return { timeLeft, isRunning, progress, start, stop, reset };
}