"use client";

import { useState, useEffect } from "react";
import {
    type PatternSet,
    VOICE_OPTIONS,
    type VoiceOption,
    type TrainingConfig,
    ROUND_TIME_MIN,
    ROUND_TIME_MAX,
    ROUND_TIME_STEP,
    formatPattern,
} from "@/lib";
import ImportModal from "./ImportModal";

interface SetupViewProps {
    config: TrainingConfig;
    patternSets: PatternSet[];
    sharedSetPreview: PatternSet | null;
    onUpdateConfig: (key: keyof TrainingConfig, value: string | number | boolean) => void;
    onStartTraining: () => void;
    onNavigateToPatternSets: () => void;
    onNavigateToAudio: () => void;
    onNavigateToMetronome: () => void;
    onNavigateToRounds: () => void;
    onImportSharedSet: () => void;
    onCancelImport: () => void;
}

export default function SetupView({
    config,
    patternSets,
    sharedSetPreview,
    onUpdateConfig,
    onStartTraining,
    onNavigateToPatternSets,
    onNavigateToAudio,
    onNavigateToMetronome,
    onNavigateToRounds,
    onImportSharedSet,
    onCancelImport,
}: SetupViewProps) {
    const currentSet = patternSets.find(s => s.id === config.selectedPatternSetId) || patternSets[0];
    const [version, setVersion] = useState<string>("");

    useEffect(() => {
        fetch("/version.json")
            .then(res => res.json())
            .then(data => setVersion(data.version))
            .catch(() => setVersion(""));
    }, []);

    return (
        <main className="min-h-screen bg-void text-canvas p-6 pt-20 md:p-12">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-12">
                    <div className="mb-6">
                        <img
                            src="/bagresponse-logo.png"
                            alt="BAGRESPONSE"
                            className="w-48 h-48 md:w-64 md:h-64 mx-auto rounded-2xl shadow-2xl border-2 border-ring-gold/30"
                        />
                    </div>
                    <h1 className="text-7xl md:text-9xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
                        BAGRESPONSE
                    </h1>
                </div>

                <div className="bg-concrete/30 rounded-lg p-8 border border-rope-gray/30">
                    {/* Round Settings */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm uppercase tracking-widest text-rope-gray" style={{ fontFamily: 'var(--font-oswald)' }}>
                                Round Settings
                            </label>
                            <button
                                onClick={onNavigateToRounds}
                                className="text-sm text-blood hover:underline"
                                style={{ fontFamily: 'var(--font-oswald)' }}
                            >
                                CONFIGURE →
                            </button>
                        </div>
                        <div className="bg-void border border-rope-gray/50 rounded px-4 py-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-rope-gray">Rounds:</span>
                                <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{config.rounds}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-rope-gray">Round Time:</span>
                                <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{Math.floor(config.roundSeconds / 60)}:{(config.roundSeconds % 60).toString().padStart(2, '0')}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-rope-gray">Rest:</span>
                                <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{config.restSeconds}s</span>
                            </div>
                        </div>
                    </div>

                    {/* Pattern Set Selection */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm uppercase tracking-widest text-rope-gray" style={{ fontFamily: 'var(--font-oswald)' }}>
                                Pattern Set
                            </label>
                            <button
                                onClick={onNavigateToPatternSets}
                                className="text-sm text-blood hover:underline"
                                style={{ fontFamily: 'var(--font-oswald)' }}
                            >
                                MANAGE SETS →
                            </button>
                        </div>
                        <div className="bg-void border border-rope-gray/50 rounded px-4 py-3 mb-3">
                            <div className="flex items-center justify-between">
                                <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem' }}>{currentSet.name}</span>
                                <span className="text-sm text-rope-gray">{currentSet.patterns.length} patterns</span>
                            </div>
                        </div>
                        <select
                            value={config.selectedPatternSetId}
                            onChange={(e) => onUpdateConfig("selectedPatternSetId", e.target.value)}
                            className="w-full bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas"
                            style={{ fontFamily: 'var(--font-oswald)' }}
                        >
                            {patternSets.map(set => (
                                <option key={set.id} value={set.id}>{set.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Audio Settings */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm uppercase tracking-widest text-rope-gray" style={{ fontFamily: 'var(--font-oswald)' }}>
                                Audio Settings
                            </label>
                            <button
                                onClick={onNavigateToAudio}
                                className="text-sm text-blood hover:underline"
                                style={{ fontFamily: 'var(--font-oswald)' }}
                            >
                                CONFIGURE →
                            </button>
                        </div>
                        <div className="bg-void border border-rope-gray/50 rounded px-4 py-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-rope-gray">Voice:</span>
                                <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{VOICE_OPTIONS.find(v => v.value === config.voice)?.label}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-rope-gray">Speed:</span>
                                <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{config.playbackSpeed.toFixed(1)}x</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-rope-gray">Overlap:</span>
                                <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{config.audioOverlap}ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Metronome */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.metronomeEnabled}
                                    onChange={(e) => onUpdateConfig("metronomeEnabled", e.target.checked)}
                                    className="w-5 h-5 rounded border-rope-gray bg-void text-blood focus:ring-blood focus:ring-offset-0"
                                />
                                <span className="text-sm uppercase tracking-widest text-rope-gray" style={{ fontFamily: 'var(--font-oswald)' }}>
                                    Metronome
                                </span>
                            </label>
                            <button
                                onClick={onNavigateToMetronome}
                                className="text-sm text-blood hover:underline"
                                style={{ fontFamily: 'var(--font-oswald)' }}
                            >
                                CONFIGURE →
                            </button>
                        </div>
                        {config.metronomeEnabled && (
                            <div className="bg-void border border-rope-gray/50 rounded px-4 py-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-rope-gray">Tempo:</span>
                                    <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{config.metronomeFrequency} BPM</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-rope-gray">Pitch:</span>
                                    <span className="text-canvas capitalize" style={{ fontFamily: 'var(--font-oswald)' }}>{config.metronomePitch}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                    <span className="text-rope-gray">Volume:</span>
                                    <span className="text-canvas" style={{ fontFamily: 'var(--font-oswald)' }}>{Math.round(config.metronomeVolume * 100)}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={onStartTraining}
                        className="w-full py-4 bg-blood text-canvas text-3xl tracking-widest rounded btn-glow hover:bg-glove-red transition-colors"
                        style={{ fontFamily: 'var(--font-bebas)' }}
                    >
                        START TRAINING
                    </button>
                </div>

                {/* Import Preview Modal */}
                {sharedSetPreview && (
                    <ImportModal
                        sharedSetPreview={sharedSetPreview}
                        onImport={onImportSharedSet}
                        onCancel={onCancelImport}
                    />
                )}

                {/* Version */}
                {version && (
                    <div className="text-center mt-6 pb-4 text-sm text-rope-gray/70" style={{ fontFamily: 'var(--font-oswald)' }}>
                        v{version}
                    </div>
                )}
            </div>
        </main>
    );
}
