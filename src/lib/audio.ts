import { useRef, useCallback, useEffect } from 'react';
import type { Pattern } from './patterns';
import type { VoiceOption } from './voices';
import { getVoicePath } from './voices';

export function useAudio(playbackSpeed: number, audioOverlap: number, voice: VoiceOption) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const activeAudioElementsRef = useRef<HTMLAudioElement[]>([]);
    const simultaneousTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
    const patternGenerationRef = useRef(0);
    const isPausedRef = useRef(false);

    // Initialize audio element
    useEffect(() => {
        if (typeof window !== "undefined") {
            audioRef.current = new Audio();
        }
    }, []);

    // Update paused ref when external state changes
    const setPaused = useCallback((paused: boolean) => {
        isPausedRef.current = paused;
    }, []);

    // Stop all active audio (main + simultaneous mode)
    const stopAllAudio = useCallback(() => {
        // Stop main audio ref
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        // Stop all simultaneous mode audio elements
        activeAudioElementsRef.current.forEach(audio => {
            audio.pause();
            audio.src = '';
        });
        activeAudioElementsRef.current = [];
        // Clear any pending simultaneous mode timeouts
        simultaneousTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        simultaneousTimeoutsRef.current = [];
    }, []);

    // Speak a pattern (sequence of numbers) using local audio files
    const speakPattern = useCallback(async (pattern: Pattern) => {
        if (isPausedRef.current || pattern.length === 0) return;

        // Stop any previous audio before starting new pattern
        stopAllAudio();

        // Increment generation to track this pattern play
        patternGenerationRef.current += 1;
        const myGeneration = patternGenerationRef.current;

        // Store pattern in a local variable to avoid stale closure issues
        const currentPattern = [...pattern];

        try {
            // For simultaneous playback: fire all audio at once with small delays
            if (audioOverlap >= 1000 && currentPattern.length > 1) {
                // Simultaneous mode: play all numbers on top of each other
                const audioElements: HTMLAudioElement[] = [];

                const audioPromises = currentPattern.map((num, index) => {
                    return new Promise<void>((resolve) => {
                        if (isPausedRef.current) {
                            resolve();
                            return;
                        }

                        const audioPath = getVoicePath(voice, num);

                        // Small staggered delay between each number (80ms)
                        const staggerDelay = index * 80;

                        const timeout = setTimeout(() => {
                            // Check if a newer pattern started
                            if (isPausedRef.current || patternGenerationRef.current !== myGeneration) {
                                resolve();
                                return;
                            }

                            // Create a fresh audio element for each number
                            const audio = new Audio();
                            audioElements.push(audio);
                            activeAudioElementsRef.current.push(audio);

                            audio.src = audioPath;
                            audio.playbackRate = playbackSpeed;

                            audio.play().then(() => {
                                // Resolve when this audio finishes
                                const handleEnded = () => {
                                    audio.removeEventListener('ended', handleEnded);
                                    resolve();
                                };
                                audio.addEventListener('ended', handleEnded);
                            }).catch(() => {
                                resolve();
                            });
                        }, staggerDelay);
                        simultaneousTimeoutsRef.current.push(timeout);
                    });
                });

                // Wait for all audio to finish
                await Promise.all(audioPromises);

                // Clean up audio elements
                audioElements.forEach(audio => {
                    audio.pause();
                    audio.src = '';
                });
            } else {
                // Sequential mode with overlap (original behavior)
                for (let i = 0; i < currentPattern.length; i++) {
                    // Check if a newer pattern started or paused
                    if (isPausedRef.current || patternGenerationRef.current !== myGeneration) break;

                    const num = currentPattern[i];
                    const audio = audioRef.current;
                    if (!audio) continue;

                    // Stop any currently playing audio
                    audio.pause();
                    audio.currentTime = 0;

                    const audioPath = getVoicePath(voice, num);

                    // Wait for audio to be ready
                    await new Promise<void>((resolve, reject) => {
                        // Check generation at start
                        if (patternGenerationRef.current !== myGeneration) {
                            resolve();
                            return;
                        }
                        const handleCanPlay = () => {
                            audio.removeEventListener('canplaythrough', handleCanPlay);
                            audio.removeEventListener('error', handleError);
                            resolve();
                        };
                        const handleError = () => {
                            audio.removeEventListener('canplaythrough', handleCanPlay);
                            audio.removeEventListener('error', handleError);
                            reject(new Error(`Failed to load audio: ${audioPath}`));
                        };
                        audio.addEventListener('canplaythrough', handleCanPlay);
                        audio.addEventListener('error', handleError);
                        audio.src = audioPath;
                        audio.playbackRate = playbackSpeed;
                        audio.load();
                        setTimeout(() => {
                            audio.removeEventListener('canplaythrough', handleCanPlay);
                            audio.removeEventListener('error', handleError);
                            resolve();
                        }, 500);
                    });

                    // Check again after await
                    if (isPausedRef.current || patternGenerationRef.current !== myGeneration) break;

                    // Play the audio
                    const playPromise = audio.play();
                    await playPromise;

                    // Check again after playing
                    if (patternGenerationRef.current !== myGeneration) break;

                    // Wait for audio to finish (with overlap)
                    if (audioOverlap > 0 && i < currentPattern.length - 1) {
                        const durationMs = (audio.duration * 1000) / playbackSpeed;
                        const waitTime = Math.max(0, durationMs - audioOverlap);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    } else {
                        await new Promise<void>((resolve) => {
                            const handleEnded = () => {
                                audio.removeEventListener('ended', handleEnded);
                                resolve();
                            };
                            audio.addEventListener('ended', handleEnded);
                        });
                    }
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name !== "AbortError" && error.name !== "NotAllowedError") {
                console.error("Speech error:", error);
            }
        }
    }, [playbackSpeed, audioOverlap, voice, stopAllAudio]);

    return {
        speakPattern,
        stopAllAudio,
        setPaused,
        patternGenerationRef,
    };
}
