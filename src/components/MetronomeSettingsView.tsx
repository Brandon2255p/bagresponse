"use client";

import { type TrainingConfig, type MetronomePitch } from "@/lib";

interface MetronomeSettingsViewProps {
    config: TrainingConfig;
    updateConfig: (key: keyof TrainingConfig, value: string | number | boolean) => void;
    onBack: () => void;
}

const PITCH_OPTIONS: { value: MetronomePitch; label: string; frequency: string }[] = [
    { value: 'low', label: 'Low', frequency: '440Hz (A4)' },
    { value: 'medium', label: 'Medium', frequency: '880Hz (A5)' },
    { value: 'high', label: 'High', frequency: '1320Hz (E6)' },
];

export default function MetronomeSettingsView({
    config,
    updateConfig,
    onBack,
}: MetronomeSettingsViewProps) {
    return (
        <main className="min-h-screen bg-void text-canvas p-6 pt-20 md:p-12">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl md:text-7xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
                        METRONOME SETTINGS
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
                    {/* Enable Metronome */}
                    <div className="mb-8">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.metronomeEnabled}
                                onChange={(e) => updateConfig("metronomeEnabled", e.target.checked)}
                                className="w-5 h-5 rounded border-rope-gray bg-void text-blood focus:ring-blood focus:ring-offset-0"
                            />
                            <span className="text-sm uppercase tracking-widest text-rope-gray" style={{ fontFamily: 'var(--font-oswald)' }}>
                                Enable Metronome
                            </span>
                        </label>
                    </div>

                    {/* Frequency Slider */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Tempo: <span className="text-blood">{config.metronomeFrequency} BPM</span>
                        </label>
                        <input
                            type="range"
                            min="40"
                            max="220"
                            step="1"
                            value={config.metronomeFrequency}
                            onChange={(e) => updateConfig("metronomeFrequency", parseInt(e.target.value))}
                            disabled={!config.metronomeEnabled}
                            className="w-full disabled:opacity-50"
                        />
                        <div className="flex justify-between text-xs text-rope-gray mt-1">
                            <span>40 (Largo)</span>
                            <span>120 (Allegro)</span>
                            <span>220 (Presto)</span>
                        </div>
                    </div>

                    {/* Pitch Selection */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Metronome Pitch
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {PITCH_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateConfig("metronomePitch", option.value)}
                                    disabled={!config.metronomeEnabled}
                                    className={`px-4 py-3 rounded transition-colors ${config.metronomePitch === option.value
                                        ? 'bg-blood text-canvas'
                                        : 'bg-concrete text-canvas hover:bg-rope-gray border border-rope-gray/50'
                                        } disabled:opacity-50`}
                                    style={{ fontFamily: 'var(--font-oswald)' }}
                                >
                                    <div className="text-lg">{option.label}</div>
                                    <div className="text-xs text-rope-gray">{option.frequency}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Volume Slider */}
                    <div className="mb-8">
                        <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Volume: <span className="text-blood">{Math.round(config.metronomeVolume * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={config.metronomeVolume}
                            onChange={(e) => updateConfig("metronomeVolume", parseFloat(e.target.value))}
                            disabled={!config.metronomeEnabled}
                            className="w-full disabled:opacity-50"
                        />
                        <div className="flex justify-between text-xs text-rope-gray mt-1">
                            <span>Quiet</span>
                            <span>Loud</span>
                        </div>
                    </div>

                    {/* Preview */}
                    {config.metronomeEnabled && (
                        <div className="mt-8 p-4 bg-void rounded-lg border border-rope-gray/30">
                            <p className="text-sm text-rope-gray text-center" style={{ fontFamily: 'var(--font-oswald)' }}>
                                Metronome will play at <span className="text-blood">{config.metronomeFrequency} BPM</span> with{' '}
                                <span className="text-blood">{PITCH_OPTIONS.find(p => p.value === config.metronomePitch)?.label}</span> pitch
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
