"use client";

import { type PatternSet, formatPattern, generateRandomPatternSet, generateCustomRandomSet } from "@/lib";
import ImportModal from "./ImportModal";
import ShareModal from "./ShareModal";

interface PatternSetsViewProps {
    patternSets: PatternSet[];
    selectedPatternSetId: string;
    editingSet: PatternSet | null;
    newSetName: string;
    newPatternInput: string;
    sharedSetPreview: PatternSet | null;
    showShareModal: boolean;
    shareUrl: string;
    copySuccess: boolean;
    onBack: () => void;
    onCreateNewSet: () => void;
    onSetNewSetName: (name: string) => void;
    onAddPatternToSet: (setId: string) => void;
    onSetNewPatternInput: (value: string) => void;
    onRemovePatternFromSet: (setId: string, pattern: number[]) => void;
    onSelectPatternSet: (setId: string) => void;
    onSharePatternSet: (set: PatternSet) => void;
    onDeleteSet: (setId: string) => void;
    onToggleEdit: (set: PatternSet | null) => void;
    onImportSharedSet: () => void;
    onCancelImport: () => void;
    onCopyShareUrl: () => void;
    onCloseShareModal: () => void;
    onAddRandomSet: (set: PatternSet) => void;
}

export default function PatternSetsView({
    patternSets,
    selectedPatternSetId,
    editingSet,
    newSetName,
    newPatternInput,
    sharedSetPreview,
    showShareModal,
    shareUrl,
    copySuccess,
    onBack,
    onCreateNewSet,
    onSetNewSetName,
    onAddPatternToSet,
    onSetNewPatternInput,
    onRemovePatternFromSet,
    onSelectPatternSet,
    onSharePatternSet,
    onDeleteSet,
    onToggleEdit,
    onImportSharedSet,
    onCancelImport,
    onCopyShareUrl,
    onCloseShareModal,
    onAddRandomSet,
}: PatternSetsViewProps) {
    return (
        <main className="min-h-screen bg-void text-canvas p-6 pt-20 md:p-12">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-5xl md:text-7xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
                        PATTERN SETS
                    </h1>
                </div>

                <button
                    onClick={onBack}
                    className="mb-6 px-4 py-2 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                    style={{ fontFamily: 'var(--font-oswald)' }}
                >
                    ← BACK TO MAIN
                </button>

                {/* Create New Set */}
                <div className="bg-concrete/30 rounded-lg p-6 border border-rope-gray/30 mb-6">
                    <h2 className="text-xl uppercase tracking-widest text-rope-gray mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
                        Create New Set
                    </h2>
                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newSetName}
                            onChange={(e) => onSetNewSetName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onCreateNewSet()}
                            placeholder="Set name"
                            className="flex-1 bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas"
                            style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                        />
                        <button
                            onClick={onCreateNewSet}
                            disabled={!newSetName.trim()}
                            className="px-6 py-2 bg-blood text-canvas rounded hover:bg-glove-red transition-colors disabled:opacity-50"
                            style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                        >
                            CREATE
                        </button>
                    </div>

                    <div className="border-t border-rope-gray/30 pt-4">
                        <h3 className="text-lg uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                            Generate Random Set
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => onAddRandomSet(generateRandomPatternSet(patternSets))}
                                className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                                style={{ fontFamily: 'var(--font-oswald)' }}
                            >
                                🎲 FULLY RANDOM
                            </button>
                            <button
                                onClick={() => onAddRandomSet(generateCustomRandomSet(patternSets, { minPatterns: 4, maxPatterns: 6, allowSingles: true, maxLength: 2 }))}
                                className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                                style={{ fontFamily: 'var(--font-oswald)' }}
                            >
                                🥊 SINGLES & DOUBLES
                            </button>
                            <button
                                onClick={() => onAddRandomSet(generateCustomRandomSet(patternSets, { minPatterns: 3, maxPatterns: 5, allowSingles: false, maxLength: 4 }))}
                                className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                                style={{ fontFamily: 'var(--font-oswald)' }}
                            >
                                🔥 COMBOS ONLY
                            </button>
                        </div>
                    </div>
                </div>

                {/* Import Preview Modal */}
                {sharedSetPreview && (
                    <ImportModal
                        sharedSetPreview={sharedSetPreview}
                        onImport={onImportSharedSet}
                        onCancel={onCancelImport}
                    />
                )}

                {/* Share Modal */}
                {showShareModal && (
                    <ShareModal
                        shareUrl={shareUrl}
                        copySuccess={copySuccess}
                        onCopy={onCopyShareUrl}
                        onClose={onCloseShareModal}
                    />
                )}

                {/* Pattern Sets List */}
                <div className="grid gap-4">
                    {patternSets.map((set) => (
                        <div key={set.id} className={`bg-concrete/30 rounded-lg p-6 border ${selectedPatternSetId === set.id ? 'border-blood' : 'border-rope-gray/30'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl" style={{ fontFamily: 'var(--font-bebas)' }}>{set.name}</h3>
                                    {set.isDefault && <span className="text-xs bg-rope-gray/30 text-rope-gray px-2 py-1 rounded">DEFAULT</span>}
                                    {selectedPatternSetId === set.id && <span className="text-xs bg-blood/30 text-blood px-2 py-1 rounded">SELECTED</span>}
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => onSelectPatternSet(set.id)}
                                        className={`px-4 py-2 rounded transition-colors ${selectedPatternSetId === set.id ? 'bg-blood text-canvas' : 'border border-blood text-blood hover:bg-blood hover:text-canvas'}`}
                                        style={{ fontFamily: 'var(--font-oswald)' }}
                                    >
                                        {selectedPatternSetId === set.id ? 'SELECTED' : 'USE'}
                                    </button>
                                    <button
                                        onClick={() => onSharePatternSet(set)}
                                        className="px-4 py-2 border border-ring-gold text-ring-gold rounded hover:bg-ring-gold hover:text-void transition-colors"
                                        style={{ fontFamily: 'var(--font-oswald)' }}
                                    >
                                        SHARE
                                    </button>
                                    {!set.isDefault && (
                                        <button
                                            onClick={() => onDeleteSet(set.id)}
                                            className="px-4 py-2 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                                            style={{ fontFamily: 'var(--font-oswald)' }}
                                        >
                                            DELETE
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onToggleEdit(editingSet?.id === set.id ? null : set)}
                                        className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                                        style={{ fontFamily: 'var(--font-oswald)' }}
                                    >
                                        {editingSet?.id === set.id ? 'DONE' : 'EDIT'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {set.patterns.map((pattern, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-void border border-rope-gray/50 rounded px-3 py-2">
                                        <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}>{formatPattern(pattern)}</span>
                                        {editingSet?.id === set.id && (
                                            <button onClick={() => onRemovePatternFromSet(set.id, pattern)} className="text-rope-gray hover:text-blood">×</button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {editingSet?.id === set.id && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newPatternInput}
                                        onChange={(e) => onSetNewPatternInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && onAddPatternToSet(set.id)}
                                        placeholder="e.g., 1 1 2"
                                        className="flex-1 bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas"
                                        style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                                    />
                                    <button
                                        onClick={() => onAddPatternToSet(set.id)}
                                        className="px-4 py-2 bg-blood text-canvas rounded hover:bg-glove-red transition-colors"
                                        style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                                    >
                                        ADD
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
