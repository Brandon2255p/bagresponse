"use client";

interface ShareModalProps {
    shareUrl: string;
    copySuccess: boolean;
    onCopy: () => void;
    onClose: () => void;
}

export default function ShareModal({
    shareUrl,
    copySuccess,
    onCopy,
    onClose,
}: ShareModalProps) {
    return (
        <div className="fixed inset-0 bg-void/90 flex items-center justify-center p-4 z-50">
            <div className="bg-concrete rounded-lg p-8 max-w-lg w-full border border-ring-gold">
                <h2 className="text-3xl mb-4 text-ring-gold" style={{ fontFamily: 'var(--font-bebas)' }}>
                    SHARE PATTERN SET
                </h2>
                <div className="bg-void rounded-lg p-4 mb-4 border border-rope-gray/30">
                    <code className="text-sm break-all text-canvas" style={{ fontFamily: 'monospace' }}>
                        {shareUrl}
                    </code>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCopy}
                        className={`flex-1 px-4 py-3 rounded transition-colors ${copySuccess ? 'bg-green-600 text-canvas' : 'bg-ring-gold text-void hover:bg-ring-gold/80'}`}
                        style={{ fontFamily: 'var(--font-oswald)' }}
                    >
                        {copySuccess ? 'COPIED!' : 'COPY LINK'}
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-3 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                        style={{ fontFamily: 'var(--font-oswald)' }}
                    >
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    );
}
