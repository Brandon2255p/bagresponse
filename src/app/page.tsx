"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type Pattern,
  type PatternSet,
  DEFAULT_PATTERN_SETS,
  formatPattern,
  generateRandomPatternSet,
  generateCustomRandomSet,
  encodePatternSet,
  decodePatternSet,
  importPatternSet,
  VOICE_OPTIONS,
  type VoiceOption,
  DEFAULT_CONFIG,
  STORAGE_KEY_CONFIG,
  STORAGE_KEY_PATTERN_SETS,
  type Phase,
  type SetupView,
  useBeeps,
  useAudio,
  ROUND_TIME_MIN,
  ROUND_TIME_MAX,
  ROUND_TIME_STEP,
} from "@/lib";

export default function Home() {
  // Pattern sets state
  const [patternSets, setPatternSets] = useState<PatternSet[]>(DEFAULT_PATTERN_SETS);
  const [patternSetsLoaded, setPatternSetsLoaded] = useState(false);

  // Training configuration
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Training state
  const [phase, setPhase] = useState<Phase>("setup");
  const [setupView, setSetupView] = useState<SetupView>("main");
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  // Pattern set builder state
  const [editingSet, setEditingSet] = useState<PatternSet | null>(null);
  const [newSetName, setNewSetName] = useState("");
  const [newPatternInput, setNewPatternInput] = useState("");

  // Share/Import state
  const [sharedSetPreview, setSharedSetPreview] = useState<PatternSet | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Timer refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const calloutRef = useRef<NodeJS.Timeout | null>(null);
  const phaseRef = useRef(phase);
  const isPausedRef = useRef(isPaused);
  const currentRoundRef = useRef(currentRound);
  const endBeepsPlayedRef = useRef(false);
  const startBeepsPlayingRef = useRef(false);

  // Audio hooks
  const { playRoundStartBeeps, playRoundEndBeeps } = useBeeps();
  const { speakPattern, stopAllAudio, setPaused } = useAudio(
    config.playbackSpeed,
    config.audioOverlap,
    config.voice
  );

  // Update refs when state changes
  phaseRef.current = phase;
  isPausedRef.current = isPaused;
  currentRoundRef.current = currentRound;

  // Sync paused state with audio hook
  useEffect(() => {
    setPaused(isPaused);
  }, [isPaused, setPaused]);

  // Stop audio when paused
  useEffect(() => {
    if (isPaused) {
      stopAllAudio();
    }
  }, [isPaused, stopAllAudio]);

  // Initialize and load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for shared pattern set in URL
    const urlParams = new URLSearchParams(window.location.search);
    const importParam = urlParams.get("import");
    if (importParam) {
      const sharedSet = decodePatternSet(importParam);
      if (sharedSet) {
        setSharedSetPreview(sharedSet);
      }
    }

    // Load pattern sets from localStorage
    const savedSets = localStorage.getItem(STORAGE_KEY_PATTERN_SETS);
    if (savedSets) {
      try {
        const parsed = JSON.parse(savedSets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const savedIds = new Set(parsed.map((s: PatternSet) => s.id));
          const missingDefaults = DEFAULT_PATTERN_SETS.filter(d => !savedIds.has(d.id));
          setPatternSets([...parsed, ...missingDefaults]);
        }
      } catch {
        // Keep defaults on error
      }
    }
    setPatternSetsLoaded(true);

    // Load config from localStorage
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Migrate old config: minutesPerRound -> roundSeconds
        if (parsed.minutesPerRound && !parsed.roundSeconds) {
          parsed.roundSeconds = Math.round(parsed.minutesPerRound * 60);
          delete parsed.minutesPerRound;
        }
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch {
        // Keep defaults on error
      }
    }
    setConfigLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && configLoaded) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    }
  }, [config, configLoaded]);

  useEffect(() => {
    if (typeof window !== "undefined" && patternSetsLoaded) {
      localStorage.setItem(STORAGE_KEY_PATTERN_SETS, JSON.stringify(patternSets));
    }
  }, [patternSets, patternSetsLoaded]);

  // Get current pattern set
  const getCurrentPatternSet = useCallback((): PatternSet => {
    return patternSets.find(s => s.id === config.selectedPatternSetId) || patternSets[0];
  }, [patternSets, config.selectedPatternSetId]);

  // Schedule next callout
  const scheduleCallout = useCallback(() => {
    if (calloutRef.current) {
      clearTimeout(calloutRef.current);
    }

    if (isPausedRef.current) return;

    const minDelay = config.baseDelay;
    const maxDelay = config.baseDelay + config.delayVariance;
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;

    const currentSet = getCurrentPatternSet();

    calloutRef.current = setTimeout(() => {
      if (isPausedRef.current) return;

      setCurrentPattern((prevPattern) => {
        const availablePatterns = currentSet.patterns.filter(
          (p) => JSON.stringify(p) !== JSON.stringify(prevPattern)
        );
        const patternsToChooseFrom = availablePatterns.length > 0 ? availablePatterns : currentSet.patterns;
        const randomPattern = patternsToChooseFrom[Math.floor(Math.random() * patternsToChooseFrom.length)];
        setFlashActive(true);
        speakPattern(randomPattern);
        setTimeout(() => setFlashActive(false), 500);
        return randomPattern;
      });

      scheduleCallout();
    }, delay * 1000);
  }, [config, getCurrentPatternSet, speakPattern]);

  // Resume callouts when unpausing
  useEffect(() => {
    if (!isPaused && phase === "round" && currentPattern !== null) {
      scheduleCallout();
    }
  }, [isPaused, phase, currentPattern, scheduleCallout]);

  // Start training
  const startTraining = async () => {
    setCurrentRound(1);
    setIsPaused(false);

    // 3 second countdown before first round
    setPhase("rest");
    setTimeRemaining(3);

    // Play start beeps at 3 seconds (immediately)
    playRoundStartBeeps();

    // Wait 3 seconds then start round
    setTimeout(() => {
      setPhase("round");
      setTimeRemaining(config.roundSeconds);
      const currentSet = getCurrentPatternSet();
      const randomPattern = currentSet.patterns[Math.floor(Math.random() * currentSet.patterns.length)];
      setCurrentPattern(randomPattern);
      setFlashActive(true);
      speakPattern(randomPattern);
      setTimeout(() => setFlashActive(false), 500);
      scheduleCallout();
    }, 3000);
  };

  // Timer effect
  useEffect(() => {
    if (phaseRef.current === "round" || phaseRef.current === "rest") {
      timerRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          setTimeRemaining((prev) => {
            // Play end beeps when 5 seconds remaining in round
            if (phaseRef.current === "round" && prev === 5 && !endBeepsPlayedRef.current) {
              endBeepsPlayedRef.current = true;
              playRoundEndBeeps();
            }

            // Play start beeps when 3 seconds remaining in rest
            if (phaseRef.current === "rest" && prev === 3 && !startBeepsPlayingRef.current) {
              startBeepsPlayingRef.current = true;
              playRoundStartBeeps();
            }

            if (prev <= 1) {
              if (phaseRef.current === "round") {
                endBeepsPlayedRef.current = false;
                stopAllAudio();
                if (calloutRef.current) clearTimeout(calloutRef.current);
                if (currentRoundRef.current < config.rounds) {
                  setPhase("rest");
                  // Reset start beeps ref when entering rest, and play immediately if rest < 3s
                  startBeepsPlayingRef.current = false;
                  if (config.restSeconds < 3) {
                    startBeepsPlayingRef.current = true;
                    playRoundStartBeeps();
                  }
                  return config.restSeconds;
                } else {
                  setPhase("complete");
                  return 0;
                }
              } else {
                // End of rest - start round immediately (beeps already played at 3s)
                startBeepsPlayingRef.current = false;
                setCurrentRound((r) => r + 1);
                setPhase("round");
                setTimeRemaining(config.roundSeconds);
                const currentSet = getCurrentPatternSet();
                const randomPattern = currentSet.patterns[Math.floor(Math.random() * currentSet.patterns.length)];
                setCurrentPattern(randomPattern);
                setFlashActive(true);
                speakPattern(randomPattern);
                setTimeout(() => setFlashActive(false), 500);
                scheduleCallout();
                return config.roundSeconds;
              }
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, config, playRoundStartBeeps, playRoundEndBeeps, getCurrentPatternSet, speakPattern, scheduleCallout]);

  // Reset training
  const resetTraining = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (calloutRef.current) clearTimeout(calloutRef.current);
    setPhase("setup");
    setSetupView("main");
    setCurrentRound(1);
    setTimeRemaining(0);
    setCurrentPattern(null);
    setIsPaused(false);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Toggle pause
  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Update config
  const updateConfig = (key: keyof typeof config, value: string | number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Pattern set management
  const createNewSet = () => {
    if (newSetName.trim()) {
      const newSet: PatternSet = {
        id: `custom-${Date.now()}`,
        name: newSetName.trim(),
        patterns: [],
      };
      setPatternSets([...patternSets, newSet]);
      setEditingSet(newSet);
      setNewSetName("");
    }
  };

  const deleteSet = (setId: string) => {
    const setToDelete = patternSets.find(s => s.id === setId);
    if (setToDelete?.isDefault) return;

    const newSets = patternSets.filter(s => s.id !== setId);
    setPatternSets(newSets);

    if (config.selectedPatternSetId === setId && newSets.length > 0) {
      updateConfig("selectedPatternSetId", newSets[0].id);
    }

    if (editingSet?.id === setId) {
      setEditingSet(null);
    }
  };

  const addPatternToSet = (setId: string) => {
    const nums = newPatternInput
      .trim()
      .split(/\s+/)
      .map(n => parseInt(n))
      .filter(n => !isNaN(n) && n >= 1 && n <= 10);

    if (nums.length > 0) {
      setPatternSets(sets => sets.map(s => {
        if (s.id === setId) {
          const patternExists = s.patterns.some(
            p => JSON.stringify(p) === JSON.stringify(nums)
          );
          if (!patternExists) {
            return { ...s, patterns: [...s.patterns, nums] };
          }
        }
        return s;
      }));
      setNewPatternInput("");
    }
  };

  const removePatternFromSet = (setId: string, pattern: Pattern) => {
    setPatternSets(sets => sets.map(s => {
      if (s.id === setId) {
        const newPatterns = s.patterns.filter(p => JSON.stringify(p) !== JSON.stringify(pattern));
        return { ...s, patterns: newPatterns.length > 0 ? newPatterns : s.patterns };
      }
      return s;
    }));
  };

  const sharePatternSet = (set: PatternSet) => {
    const encoded = encodePatternSet(set);
    if (encoded && typeof window !== "undefined") {
      const url = `${window.location.origin}${window.location.pathname}?import=${encoded}`;
      setShareUrl(url);
      setShowShareModal(true);
      setCopySuccess(false);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback
    }
  };

  const importSharedSet = (set: PatternSet) => {
    const newSet = importPatternSet(set, patternSets);
    setPatternSets([...patternSets, newSet]);
    setSharedSetPreview(null);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("import");
      window.history.replaceState({}, "", url);
    }
  };

  const cancelImport = () => {
    setSharedSetPreview(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("import");
      window.history.replaceState({}, "", url);
    }
  };

  // Views
  if (phase === "setup" && setupView === "pattern-sets") {
    return (
      <main className="min-h-screen bg-void text-canvas p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
              PATTERN SETS
            </h1>
          </div>

          <button
            onClick={() => setSetupView("main")}
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
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createNewSet()}
                placeholder="Set name"
                className="flex-1 bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
              />
              <button
                onClick={createNewSet}
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
                  onClick={() => setPatternSets([...patternSets, generateRandomPatternSet(patternSets)])}
                  className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                  style={{ fontFamily: 'var(--font-oswald)' }}
                >
                  🎲 FULLY RANDOM
                </button>
                <button
                  onClick={() => setPatternSets([...patternSets, generateCustomRandomSet(patternSets, { minPatterns: 4, maxPatterns: 6, allowSingles: true, maxLength: 2 })])}
                  className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                  style={{ fontFamily: 'var(--font-oswald)' }}
                >
                  🥊 SINGLES & DOUBLES
                </button>
                <button
                  onClick={() => setPatternSets([...patternSets, generateCustomRandomSet(patternSets, { minPatterns: 3, maxPatterns: 5, allowSingles: false, maxLength: 4 })])}
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
                    onClick={() => importSharedSet(sharedSetPreview)}
                    className="flex-1 px-4 py-3 bg-ring-gold text-void rounded hover:bg-ring-gold/80 transition-colors"
                    style={{ fontFamily: 'var(--font-oswald)' }}
                  >
                    IMPORT SET
                  </button>
                  <button
                    onClick={cancelImport}
                    className="flex-1 px-4 py-3 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                    style={{ fontFamily: 'var(--font-oswald)' }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Share Modal */}
          {showShareModal && (
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
                    onClick={copyShareUrl}
                    className={`flex-1 px-4 py-3 rounded transition-colors ${copySuccess ? 'bg-green-600 text-canvas' : 'bg-ring-gold text-void hover:bg-ring-gold/80'}`}
                    style={{ fontFamily: 'var(--font-oswald)' }}
                  >
                    {copySuccess ? 'COPIED!' : 'COPY LINK'}
                  </button>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-3 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                    style={{ fontFamily: 'var(--font-oswald)' }}
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pattern Sets List */}
          <div className="grid gap-4">
            {patternSets.map((set) => (
              <div key={set.id} className={`bg-concrete/30 rounded-lg p-6 border ${config.selectedPatternSetId === set.id ? 'border-blood' : 'border-rope-gray/30'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl" style={{ fontFamily: 'var(--font-bebas)' }}>{set.name}</h3>
                    {set.isDefault && <span className="text-xs bg-rope-gray/30 text-rope-gray px-2 py-1 rounded">DEFAULT</span>}
                    {config.selectedPatternSetId === set.id && <span className="text-xs bg-blood/30 text-blood px-2 py-1 rounded">SELECTED</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => updateConfig("selectedPatternSetId", set.id)}
                      className={`px-4 py-2 rounded transition-colors ${config.selectedPatternSetId === set.id ? 'bg-blood text-canvas' : 'border border-blood text-blood hover:bg-blood hover:text-canvas'}`}
                      style={{ fontFamily: 'var(--font-oswald)' }}
                    >
                      {config.selectedPatternSetId === set.id ? 'SELECTED' : 'USE'}
                    </button>
                    <button
                      onClick={() => sharePatternSet(set)}
                      className="px-4 py-2 border border-ring-gold text-ring-gold rounded hover:bg-ring-gold hover:text-void transition-colors"
                      style={{ fontFamily: 'var(--font-oswald)' }}
                    >
                      SHARE
                    </button>
                    {!set.isDefault && (
                      <button
                        onClick={() => deleteSet(set.id)}
                        className="px-4 py-2 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                        style={{ fontFamily: 'var(--font-oswald)' }}
                      >
                        DELETE
                      </button>
                    )}
                    <button
                      onClick={() => setEditingSet(editingSet?.id === set.id ? null : set)}
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
                        <button onClick={() => removePatternFromSet(set.id, pattern)} className="text-rope-gray hover:text-blood">×</button>
                      )}
                    </div>
                  ))}
                </div>

                {editingSet?.id === set.id && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPatternInput}
                      onChange={(e) => setNewPatternInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPatternToSet(set.id)}
                      placeholder="e.g., 1 1 2"
                      className="flex-1 bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas"
                      style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                    />
                    <button
                      onClick={() => addPatternToSet(set.id)}
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

  if (phase === "setup") {
    const currentSet = getCurrentPatternSet();

    return (
      <main className="min-h-screen bg-void text-canvas p-6 md:p-12">
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

            {/* Pattern Set Selection */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm uppercase tracking-widest text-rope-gray" style={{ fontFamily: 'var(--font-oswald)' }}>
                  Pattern Set
                </label>
                <button
                  onClick={() => setSetupView("pattern-sets")}
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
                onChange={(e) => updateConfig("selectedPatternSetId", e.target.value)}
                className="w-full bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas"
                style={{ fontFamily: 'var(--font-oswald)' }}
              >
                {patternSets.map(set => (
                  <option key={set.id} value={set.id}>{set.name}</option>
                ))}
              </select>
            </div>

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
            </div>

            {/* Audio Overlap */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Audio Overlap: <span className="text-blood">{config.audioOverlap}ms</span>
              </label>
              <input
                type="range"
                min="0"
                max="1500"
                step="100"
                value={config.audioOverlap}
                onChange={(e) => updateConfig("audioOverlap", parseInt(e.target.value))}
              />
            </div>

            {/* Callout Delay */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Callout Delay: <span className="text-blood">{config.baseDelay}s</span> to <span className="text-blood">{config.baseDelay + config.delayVariance}s</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={config.baseDelay}
                onChange={(e) => updateConfig("baseDelay", parseInt(e.target.value))}
                className="mb-4"
              />
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={config.delayVariance}
                onChange={(e) => updateConfig("delayVariance", parseInt(e.target.value))}
              />
            </div>

            {/* Start Button */}
            <button
              onClick={startTraining}
              className="w-full py-4 bg-blood text-canvas text-3xl tracking-widest rounded btn-glow hover:bg-glove-red transition-colors"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              START TRAINING
            </button>
          </div>
        </div>

        {/* Import Preview Modal */}
        {sharedSetPreview && (
          <div className="fixed inset-0 bg-void/90 flex items-center justify-center p-4 z-50">
            <div className="bg-concrete rounded-lg p-8 max-w-md w-full border border-ring-gold">
              <h2 className="text-3xl mb-4 text-ring-gold" style={{ fontFamily: 'var(--font-bebas)' }}>
                IMPORT PATTERN SET
              </h2>
              <div className="bg-void rounded-lg p-4 mb-6 border border-rope-gray/30">
                <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>{sharedSetPreview.name}</h3>
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
                  onClick={() => importSharedSet(sharedSetPreview)}
                  className="flex-1 px-4 py-3 bg-ring-gold text-void rounded hover:bg-ring-gold/80 transition-colors"
                >
                  IMPORT SET
                </button>
                <button
                  onClick={cancelImport}
                  className="flex-1 px-4 py-3 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="min-h-screen bg-void text-canvas flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-8xl md:text-9xl text-ring-gold mb-4" style={{ fontFamily: 'var(--font-bebas)' }}>
            COMPLETE
          </h2>
          <p className="text-2xl text-rope-gray mb-8 uppercase tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
            {config.rounds} Rounds Finished
          </p>
          <button
            onClick={resetTraining}
            className="px-12 py-4 bg-blood text-canvas text-3xl tracking-widest rounded btn-glow hover:bg-glove-red transition-colors"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            TRAIN AGAIN
          </button>
        </div>
      </main>
    );
  }

  // Active training view
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

      {/* Playback Speed Control */}
      <div className="mb-6 w-full max-w-xs z-10 relative">
        <label className="block text-xs uppercase tracking-widest text-rope-gray mb-1 text-center" style={{ fontFamily: 'var(--font-oswald)' }}>
          Playback Speed: <span className="text-blood">{config.playbackSpeed.toFixed(1)}x</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={config.playbackSpeed}
          onChange={(e) => updateConfig("playbackSpeed", parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Controls */}
      <div className="flex gap-4 z-10 relative">
        <button
          onClick={togglePause}
          className="px-8 py-3 bg-concrete text-canvas text-lg uppercase tracking-widest rounded hover:bg-rope-gray transition-colors"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          {isPaused ? "RESUME" : "PAUSE"}
        </button>
        <button
          onClick={resetTraining}
          className="px-8 py-3 border border-blood text-blood text-lg uppercase tracking-widest rounded hover:bg-blood hover:text-canvas transition-colors"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          STOP
        </button>
      </div>
    </main>
  );
}
