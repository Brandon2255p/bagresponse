"use client";

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
    onImportSharedSet,
    onCancelImport,
}: SetupViewProps) {
    const currentSet = patternSets.find(s => s.id === config.selectedPatternSetId) || patternSets[0];

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
                    {/* Rounds */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Rounds: <span className="text-blood">{config.rounds}</span>
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={config.rounds}
                            onChange={(e) => onUpdateConfig("rounds", parseInt(e.target.value))}
                        />
                    </div>

                    {/* Round Time */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Round Time: <span className="text-blood">{Math.floor(config.roundSeconds / 60)}:{(config.roundSeconds % 60).toString().padStart(2, '0')}</span>
                        </label>
                        <input
                            type="range"
                            min={ROUND_TIME_MIN}
                            max={ROUND_TIME_MAX}
                            step={ROUND_TIME_STEP}
                            value={config.roundSeconds}
                            onChange={(e) => onUpdateConfig("roundSeconds", parseInt(e.target.value))}
                        />
                        <div className="flex justify-between text-xs text-rope-gray mt-1">
                            <span>0:30</span>
                            <span>2:30</span>
                            <span>5:00</span>
                        </div>
                    </div>

                    {/* Rest Period */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Rest Between Rounds: <span className="text-blood">{config.restSeconds}s</span>
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="120"
                            step="5"
                            value={config.restSeconds}
                            onChange={(e) => onUpdateConfig("restSeconds", parseInt(e.target.value))}
                        />
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

                    {/* Callout Delay */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Callout Delay: <span className="text-blood">{config.baseDelay.toFixed(1)}s</span> to <span className="text-blood">{(config.baseDelay + config.delayVariance).toFixed(1)}s</span>
                        </label>
                        <input
                            type="range"
                            min="0.3"
                            max="8"
                            step="0.1"
                            value={config.baseDelay}
                            onChange={(e) => onUpdateConfig("baseDelay", parseFloat(e.target.value))}
                            className="mb-4"
                        />
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={config.delayVariance}
                            onChange={(e) => onUpdateConfig("delayVariance", parseFloat(e.target.value))}
                        />
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
            </div>
        </main>
    );
}
