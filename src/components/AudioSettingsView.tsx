"use client";

import {
    type TrainingConfig,
    VOICE_OPTIONS,
    type VoiceOption,
} from "@/lib";

interface AudioSettingsViewProps {
    config: {
        voice: VoiceOption;
        playbackSpeed: number;
        audioOverlap: number;
    };
    updateConfig: (key: keyof TrainingConfig, value: string | number) => void;
    onBack: () => void;
}

export default function AudioSettingsView({
    config,
    updateConfig,
    onBack,
}: AudioSettingsViewProps) {
    return (
        <main className="min-h-screen bg-void text-canvas p-6 pt-20 md:p-12">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl md:text-7xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
                        AUDIO SETTINGS
                    </h1>
                </div>

                <button
                    onClick={onBack}
                    className="mb-6 px-4 py-2 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                    style={{ fontFamily: 'var(--font-oswald)' }}
                >
                    ← BACK TO MAIN
                </button>

                <div className="bg-concrete/30 rounded-lg p-8 border border-rope-gray/30">
                    {/* Voice Selection */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Callout Voice: <span className="text-blood">{VOICE_OPTIONS.find(v => v.value === config.voice)?.label}</span>
                        </label>
                        <select
                            value={config.voice}
                            onChange={(e) => updateConfig("voice", e.target.value as VoiceOption)}
                            className="w-full bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas"
                            style={{ fontFamily: 'var(--font-oswald)' }}
                        >
                            {VOICE_OPTIONS.map(voice => (
                                <option key={voice.value} value={voice.value}>{voice.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Playback Speed */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Playback Speed: <span className="text-blood">{config.playbackSpeed.toFixed(1)}x</span>
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={config.playbackSpeed}
                            onChange={(e) => updateConfig("playbackSpeed", parseFloat(e.target.value))}
                        />
                        <div className="flex justify-between text-xs text-rope-gray mt-1">
                            <span>Slow (0.5x)</span>
                            <span>Normal (1.0x)</span>
                            <span>Fast (2.0x)</span>
                        </div>
                    </div>

                    {/* Audio Overlap */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Audio Overlap: <span className="text-blood">{config.audioOverlap}ms</span>
                            <span className="text-rope-gray/70 text-xs ml-2">
                                ({config.audioOverlap >= 1000 ? '≥1000ms = simultaneous playback!' : 'negative delay between numbers'})
                            </span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1500"
                            step="100"
                            value={config.audioOverlap}
                            onChange={(e) => updateConfig("audioOverlap", parseInt(e.target.value))}
                        />
                        <div className="flex justify-between text-xs text-rope-gray mt-1">
                            <span>Sequential</span>
                            <span>Overlap</span>
                            <span>Simultaneous!</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
