import { useRef, useCallback, useEffect } from 'react';

export function useBeeps() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const isPlayingStartBeepsRef = useRef(false);
    const isPlayingEndBeepsRef = useRef(false);

    // Initialize audio context
    useEffect(() => {
        if (typeof window !== "undefined" && !audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
    }, []);

    // Play a single beep using Web Audio API
    const playBeep = useCallback((
        frequency: number = 800,
        duration: number = 200,
        type: OscillatorType = 'sine',
        volume: number = 0.3
    ): Promise<void> => {
        return new Promise((resolve) => {
            if (!audioContextRef.current) {
                resolve();
                return;
            }

            const ctx = audioContextRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            // Envelope for smoother sound
            gainNode.gain.setValueAtTime(0, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration / 1000);

            setTimeout(() => {
                resolve();
            }, duration);
        });
    }, []);

    // Play round start sequence: 2 short beeps + 1 long beep
    const playRoundStartBeeps = useCallback(async () => {
        // Prevent overlapping calls
        if (isPlayingStartBeepsRef.current) {
            return;
        }
        isPlayingStartBeepsRef.current = true;

        try {
            const loudVolume = 0.6;
            await playBeep(1200, 300, 'sine', loudVolume);
            await new Promise(resolve => setTimeout(resolve, 700));
            await playBeep(1200, 300, 'sine', loudVolume);
            await new Promise(resolve => setTimeout(resolve, 700));
            await playBeep(600, 1000, 'sine', loudVolume);
        } finally {
            isPlayingStartBeepsRef.current = false;
        }
    }, [playBeep]);

    // Play round end sequence: 3 short beeps + 1 long beep (louder)
    const playRoundEndBeeps = useCallback(async () => {
        // Prevent overlapping calls
        if (isPlayingEndBeepsRef.current) {
            return;
        }
        isPlayingEndBeepsRef.current = true;

        try {
            const loudVolume = 0.6;
            await playBeep(1000, 400, 'sine', loudVolume);
            await new Promise(resolve => setTimeout(resolve, 600));
            await playBeep(1000, 400, 'sine', loudVolume);
            await new Promise(resolve => setTimeout(resolve, 600));
            await playBeep(1000, 400, 'sine', loudVolume);
            await new Promise(resolve => setTimeout(resolve, 600));
            await playBeep(600, 1000, 'sine', loudVolume);
        } finally {
            isPlayingEndBeepsRef.current = false;
        }
    }, [playBeep]);

    return {
        playBeep,
        playRoundStartBeeps,
        playRoundEndBeeps,
    };
}
