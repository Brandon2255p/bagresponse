"use client";

import { useState, useRef, useEffect } from "react";
import { type Pattern, type TrainingConfig, type Phase, formatPattern } from "@/lib";

interface TrainingViewProps {
    phase: Phase;
    currentRound: number;
    timeRemaining: number;
    currentPattern: Pattern | null;
    isPaused: boolean;
    flashActive: boolean;
    config: TrainingConfig;
    onTogglePause: () => void;
    onResetTraining: () => void;
    onUpdateConfig: (key: keyof TrainingConfig, value: string | number) => void;
}

export default function TrainingView({
    phase,
    currentRound,
    timeRemaining,
    currentPattern,
    isPaused,
    flashActive,
    config,
    onTogglePause,
    onResetTraining,
    onUpdateConfig,
}: TrainingViewProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const [showSettings, setShowSettings] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [unlockProgress, setUnlockProgress] = useState(0);
    const unlockTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleLockPress = () => {
        if (!isLocked) {
            // Start locking - just toggle immediately
            setIsLocked(true);
        }
    };

    const handleUnlockPress = () => {
        if (isLocked) {
            // Start unlock countdown
            setUnlockProgress(0);
            unlockTimerRef.current = setInterval(() => {
                setUnlockProgress(prev => {
                    if (prev >= 100) {
                        if (unlockTimerRef.current) {
                            clearInterval(unlockTimerRef.current);
                        }
                        setIsLocked(false);
                        setUnlockProgress(0);
                        return 100;
                    }
                    return prev + (100 / 50); // 100% / 5 seconds = 20% per second (50ms intervals)
                });
            }, 100);
        }
    };

    const handleUnlockRelease = () => {
        if (unlockTimerRef.current) {
            clearInterval(unlockTimerRef.current);
        }
        setUnlockProgress(0);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (unlockTimerRef.current) {
                clearInterval(unlockTimerRef.current);
            }
        };
    }, []);

    return (
        <main className={`h-screen overflow-hidden ${phase === "rest" ? "rest-period" : "bg-void"} text-canvas flex flex-col items-center justify-center p-4 relative ${flashActive ? "callout-flash" : ""}`}>
            {/* Background Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ opacity: 0.08 }}>
                <img src="/bagresponse-logo.png" alt="" className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] object-contain" />
            </div>

            {/* Round Indicators */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 flex-wrap justify-center max-w-full px-4 z-10">
                {Array.from({ length: config.rounds }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${i < currentRound - 1 ? "round-complete" : i === currentRound - 1 ? (phase === "round" ? "round-active animate-pulse" : "round-complete") : "round-pending"
                            }`}
                    />
                ))}
            </div>

            {/* Round Counter */}
            <div className="text-center mb-4 z-10 relative">
                <p className="text-rope-gray uppercase tracking-widest text-xl md:text-2xl" style={{ fontFamily: 'var(--font-oswald)' }}>
                    {phase === "rest" ? "REST PERIOD" : `ROUND ${currentRound} OF ${config.rounds}`}
                </p>
            </div>

            {/* Timer */}
            <div className="text-center mb-8 z-10 relative">
                <div className={`text-[8rem] md:text-[10rem] leading-none ${phase === "round" ? "timer-active text-canvas" : "text-ring-gold"}`} style={{ fontFamily: 'var(--font-bebas)' }}>
                    {formatTime(timeRemaining)}
                </div>
            </div>

            {/* Current Pattern */}
            {phase === "round" && (
                <div className="text-center mb-8 ring-rope py-6 px-12 z-10 relative">
                    <p className="text-rope-gray uppercase tracking-widest text-sm mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
                        Current Pattern
                    </p>
                    <div className={`text-[6rem] md:text-[8rem] leading-none text-blood transition-all duration-200 ${flashActive ? "scale-110" : "scale-100"}`} style={{ fontFamily: 'var(--font-bebas)' }}>
                        {currentPattern ? formatPattern(currentPattern) : "—"}
                    </div>
                </div>
            )}

            {/* Settings Toggle */}
            <button
                onClick={() => setShowSettings(!showSettings)}
                className="mb-4 text-xs text-rope-gray uppercase tracking-widest hover:text-blood z-10 relative"
                style={{ fontFamily: 'var(--font-oswald)' }}
            >
                {showSettings ? '▲ HIDE SETTINGS' : '▼ SHOW SETTINGS'}
            </button>

            {/* Settings Panel */}
            {showSettings && (
                <>
                    {/* Playback Speed Control */}
                    <div className={`mb-4 w-full max-w-xs z-10 relative ${isLocked ? 'opacity-30 pointer-events-none' : ''}`}>
                        <label className="block text-xs uppercase tracking-widest text-rope-gray mb-1 text-center" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Playback Speed: <span className="text-blood">{config.playbackSpeed.toFixed(1)}x</span>
                        </label>
                        <input
                            type="range"
                            min="0.8"
                            max="1.8"
                            step="0.1"
                            value={config.playbackSpeed}
                            onChange={(e) => onUpdateConfig("playbackSpeed", parseFloat(e.target.value))}
                            className="w-full"
                            disabled={isLocked}
                        />
                    </div>

                    {/* Callout Delay Control */}
                    <div className={`mb-4 w-full max-w-xs z-10 relative ${isLocked ? 'opacity-30 pointer-events-none' : ''}`}>
                        <label className="block text-xs uppercase tracking-widest text-rope-gray mb-1 text-center" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Delay: <span className="text-blood">{config.baseDelay.toFixed(1)}s</span> to <span className="text-blood">{(config.baseDelay + config.delayVariance).toFixed(1)}s</span>
                        </label>
                        <input
                            type="range"
                            min="0.3"
                            max="8"
                            step="0.1"
                            value={config.baseDelay}
                            onChange={(e) => onUpdateConfig("baseDelay", parseFloat(e.target.value))}
                            className="w-full mb-2"
                            disabled={isLocked}
                        />
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={config.delayVariance}
                            onChange={(e) => onUpdateConfig("delayVariance", parseFloat(e.target.value))}
                            className="w-full"
                            disabled={isLocked}
                        />
                    </div>
                </>
            )}

            {/* Controls */}
            <div className="flex gap-4 z-10 relative">
                <button
                    onClick={onTogglePause}
                    disabled={isLocked}
                    className={`px-8 py-3 text-lg uppercase tracking-widest rounded transition-colors ${isLocked ? 'opacity-30 cursor-not-allowed' : 'bg-concrete text-canvas hover:bg-rope-gray'}`}
                    style={{ fontFamily: 'var(--font-oswald)' }}
                >
                    {isPaused ? "RESUME" : "PAUSE"}
                </button>
                <button
                    onClick={onResetTraining}
                    disabled={isLocked}
                    className={`px-8 py-3 text-lg uppercase tracking-widest rounded transition-colors ${isLocked ? 'opacity-30 cursor-not-allowed' : 'border border-blood text-blood hover:bg-blood hover:text-canvas'}`}
                    style={{ fontFamily: 'var(--font-oswald)' }}
                >
                    STOP
                </button>
                {/* Lock Button */}
                <button
                    onMouseDown={handleLockPress}
                    onMouseUp={handleUnlockRelease}
                    onMouseLeave={handleUnlockRelease}
                    onTouchStart={handleLockPress}
                    onTouchEnd={handleUnlockRelease}
                    className={`px-8 py-3 text-lg uppercase tracking-widest rounded transition-colors ${isLocked
                        ? 'bg-ring-gold text-void'
                        : 'border border-ring-gold text-ring-gold hover:bg-ring-gold hover:text-void'
                        }`}
                    style={{ fontFamily: 'var(--font-oswald)' }}
                >
                    {isLocked ? `UNLOCK ${Math.ceil((100 - unlockProgress) / 20)}s` : 'LOCK'}
                </button>
            </div>
        </main>
    );
}
