"use client";

interface CompleteViewProps {
    rounds: number;
    onResetTraining: () => void;
}

export default function CompleteView({
    rounds,
    onResetTraining,
}: CompleteViewProps) {
    return (
        <main className="min-h-screen bg-void text-canvas flex items-center justify-center p-6">
            <div className="text-center">
                <h2 className="text-8xl md:text-9xl text-ring-gold mb-4" style={{ fontFamily: 'var(--font-bebas)' }}>
                    COMPLETE
                </h2>
                <p className="text-2xl text-rope-gray mb-8 uppercase tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
                    {rounds} Rounds Finished
                </p>
                <button
                    onClick={onResetTraining}
                    className="px-12 py-4 bg-blood text-canvas text-3xl tracking-widest rounded btn-glow hover:bg-glove-red transition-colors"
                    style={{ fontFamily: 'var(--font-bebas)' }}
                >
                    TRAIN AGAIN
                </button>
            </div>
        </main>
    );
}
