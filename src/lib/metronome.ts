"use client";

import { useRef, useCallback } from 'react';
import type { MetronomePitch } from './config';

export function useMetronome(
    frequency: number,
    pitch: MetronomePitch
) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isRunningRef = useRef(false);

    // Get frequency based on pitch setting
    const getPitchFrequency = useCallback((pitchSetting: MetronomePitch): number => {
        switch (pitchSetting) {
            case 'low':
                return 440; // A4
            case 'medium':
                return 880; // A5
            case 'high':
                return 1320; // E6
            default:
                return 880;
        }
    }, []);

    // Play a single tick
    const playTick = useCallback(() => {
        if (!audioContextRef.current || !isRunningRef.current) return;

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = getPitchFrequency(pitch);
        oscillator.type = 'sine';

        // Short tick envelope
        const now = ctx.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }, [pitch, getPitchFrequency]);

    // Start metronome
    const startMetronome = useCallback(() => {
        if (isRunningRef.current || frequency <= 0) return;

        // Initialize audio context on user interaction
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }

        isRunningRef.current = true;

        // Calculate interval in ms
        const intervalMs = 60000 / frequency;

        // Play first tick immediately
        playTick();

        // Set up interval for subsequent ticks
        intervalRef.current = setInterval(() => {
            if (isRunningRef.current) {
                playTick();
            }
        }, intervalMs);
    }, [frequency, playTick]);

    // Stop metronome
    const stopMetronome = useCallback(() => {
        isRunningRef.current = false;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    return {
        startMetronome,
        stopMetronome,
    };
}
