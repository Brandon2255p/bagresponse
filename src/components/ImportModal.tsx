"use client";

import { type PatternSet, formatPattern } from "@/lib";

interface ImportModalProps {
    sharedSetPreview: PatternSet;
    onImport: () => void;
    onCancel: () => void;
}

export default function ImportModal({
    sharedSetPreview,
    onImport,
    onCancel,
}: ImportModalProps) {
    return (
        <div className="fixed inset-0 bg-void/90 flex items-center justify-center p-4 z-50">
            <div className="bg-concrete rounded-lg p-8 max-w-md w-full border border-ring-gold">
                <h2 className="text-3xl mb-4 text-ring-gold" style={{ fontFamily: 'var(--font-bebas)' }}>
                    IMPORT PATTERN SET
                </h2>
                <div className="bg-void rounded-lg p-4 mb-6 border border-rope-gray/30">
                    <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
                        {sharedSetPreview.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {sharedSetPreview.patterns.map((pattern, idx) => (
                            <span key={idx} className="text-sm bg-concrete border border-rope-gray/50 rounded px-2 py-1" style={{ fontFamily: 'var(--font-bebas)' }}>
                                {formatPattern(pattern)}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onImport}
                        className="flex-1 px-4 py-3 bg-ring-gold text-void rounded hover:bg-ring-gold/80 transition-colors"
                        style={{ fontFamily: 'var(--font-oswald)' }}
                    >
                        IMPORT SET
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                        style={{ fontFamily: 'var(--font-oswald)' }}
                    >
                        CANCEL
                    </button>
                </div>
            </div>
        </div>
    );
}
