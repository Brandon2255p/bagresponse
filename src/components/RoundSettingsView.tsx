"use client";

import { type TrainingConfig, ROUND_TIME_MIN, ROUND_TIME_MAX, ROUND_TIME_STEP } from "@/lib";

interface RoundSettingsViewProps {
    config: TrainingConfig;
    updateConfig: (key: keyof TrainingConfig, value: string | number | boolean) => void;
    onBack: () => void;
}

export default function RoundSettingsView({
    config,
    updateConfig,
    onBack,
}: RoundSettingsViewProps) {
    return (
        <main className="min-h-screen bg-void text-canvas p-6 pt-20 md:p-12">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl md:text-7xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
                        ROUND SETTINGS
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
                            onChange={(e) => updateConfig("rounds", parseInt(e.target.value))}
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
                            onChange={(e) => updateConfig("roundSeconds", parseInt(e.target.value))}
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
                            onChange={(e) => updateConfig("restSeconds", parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
