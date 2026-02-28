"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// A pattern is a sequence of numbers (e.g., [1, 1, 2] or [1, 2])
type Pattern = number[];

// A pattern set has a name and collection of patterns
interface PatternSet {
  id: string;
  name: string;
  patterns: Pattern[];
  isDefault?: boolean;
}

interface TrainingConfig {
  rounds: number;
  minutesPerRound: number;
  restSeconds: number;
  selectedPatternSetId: string;
  baseDelay: number;
  delayVariance: number;
  playbackSpeed: number;
}

type Phase = "setup" | "round" | "rest" | "complete";
type SetupView = "main" | "pattern-sets";

// Predefined pattern sets
const DEFAULT_PATTERN_SETS: PatternSet[] = [
  {
    id: "basic-1",
    name: "Basic 1",
    patterns: [[1], [2], [1, 2]],
    isDefault: true,
  },
  {
    id: "basic-2",
    name: "Basic 2",
    patterns: [[3], [4], [3, 4]],
    isDefault: true,
  },
  {
    id: "basic-3",
    name: "Basic 3",
    patterns: [[1, 2, 3, 4], [1, 2], [3, 4]],
    isDefault: true,
  },
  {
    id: "advanced",
    name: "Advanced",
    patterns: [[1, 1, 2], [1, 2, 1, 2], [1, 2, 3, 4], [3, 4]],
    isDefault: true,
  },
];

const STORAGE_KEY_CONFIG = "bagresponse-settings";
const STORAGE_KEY_PATTERN_SETS = "bagresponse-pattern-sets";

export default function Home() {
  // Pattern sets state - start with defaults, load from storage in useEffect
  const [patternSets, setPatternSets] = useState<PatternSet[]>(DEFAULT_PATTERN_SETS);
  const [patternSetsLoaded, setPatternSetsLoaded] = useState(false);

  // Training configuration - start with defaults, load from storage in useEffect
  const [config, setConfig] = useState<TrainingConfig>({
    rounds: 10,
    minutesPerRound: 2,
    restSeconds: 30,
    selectedPatternSetId: DEFAULT_PATTERN_SETS[0].id,
    baseDelay: 3,
    delayVariance: 2,
    playbackSpeed: 1.0,
  });
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

  // Refs for timer management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const calloutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element and load from localStorage on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();

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
            // Merge with defaults to ensure all default sets exist
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
          setConfig(prev => ({ ...prev, ...parsed }));
        } catch {
          // Keep defaults on error
        }
      }
      setConfigLoaded(true);
    }
  }, []);

  // Save config to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (typeof window !== "undefined" && configLoaded) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    }
  }, [config, configLoaded]);

  // Save pattern sets to localStorage whenever they change (only after initial load)
  useEffect(() => {
    if (typeof window !== "undefined" && patternSetsLoaded) {
      localStorage.setItem(STORAGE_KEY_PATTERN_SETS, JSON.stringify(patternSets));
    }
  }, [patternSets, patternSetsLoaded]);

  // Get current pattern set
  const getCurrentPatternSet = (): PatternSet => {
    return patternSets.find(s => s.id === config.selectedPatternSetId) || patternSets[0];
  };

  // Track play promise to handle interruptions
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Speak a pattern (sequence of numbers) using local audio files
  const speakPattern = useCallback(async (pattern: Pattern) => {
    if (!audioRef.current || isPausedRef.current || pattern.length === 0) return;

    try {
      for (const num of pattern) {
        if (isPausedRef.current) break;

        // Wait for any pending play to settle
        if (playPromiseRef.current) {
          await playPromiseRef.current.catch(() => { });
        }

        // Stop any currently playing audio
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        // Play from local audio file
        audioRef.current.src = `/sounds/${num}.wav`;
        audioRef.current.playbackRate = config.playbackSpeed;
        const playPromise = audioRef.current.play();
        playPromiseRef.current = playPromise;
        await playPromise;

        // Small pause between numbers in a pattern (adjusted by playback speed)
        if (pattern.length > 1) {
          const adjustedDelay = 400 / config.playbackSpeed;
          await new Promise(resolve => setTimeout(resolve, adjustedDelay));
        }
      }
    } catch (error) {
      // Ignore abort errors (interrupted by pause) and NotAllowedError (autoplay policy)
      if (error instanceof Error && error.name !== "AbortError" && error.name !== "NotAllowedError") {
        console.error("Speech error:", error);
      }
    }
  }, []);

  // Pause/unpause audio when isPaused changes
  useEffect(() => {
    if (isPaused && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPaused]);

  // Schedule next callout - using refs to avoid stale closures
  const scheduleCallout = useCallback(() => {
    if (calloutRef.current) {
      clearTimeout(calloutRef.current);
    }

    // Don't schedule if paused
    if (isPausedRef.current) return;

    const minDelay = config.baseDelay;
    const maxDelay = config.baseDelay + config.delayVariance;
    const delay = Math.random() * (maxDelay - minDelay) + minDelay;

    const currentSet = getCurrentPatternSet();

    calloutRef.current = setTimeout(() => {
      // Check again when timeout fires in case we paused while waiting
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

      // Schedule next callout
      scheduleCallout();
    }, delay * 1000);
  }, [config, patternSets, speakPattern]);

  // Resume callouts when unpausing during a round
  useEffect(() => {
    if (!isPaused && phase === "round" && currentPattern !== null) {
      scheduleCallout();
    }
  }, [isPaused, phase, currentPattern, scheduleCallout]);

  // Start training
  const startTraining = () => {
    setCurrentRound(1);
    setPhase("round");
    setTimeRemaining(config.minutesPerRound * 60);
    setIsPaused(false);

    const currentSet = getCurrentPatternSet();

    // Initial callout after short delay
    setTimeout(() => {
      const randomPattern = currentSet.patterns[Math.floor(Math.random() * currentSet.patterns.length)];
      setCurrentPattern(randomPattern);
      setFlashActive(true);
      speakPattern(randomPattern);
      setTimeout(() => setFlashActive(false), 500);
      scheduleCallout();
    }, 2000);
  };

  // Timer effect - using refs to track current values and avoid stale closures
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;

  useEffect(() => {
    if (phaseRef.current === "round" || phaseRef.current === "rest") {
      timerRef.current = setInterval(() => {
        if (!isPausedRef.current) {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              // Phase complete
              if (phaseRef.current === "round") {
                // End of round
                if (currentRoundRef.current < config.rounds) {
                  setPhase("rest");
                  if (calloutRef.current) clearTimeout(calloutRef.current);
                  return config.restSeconds;
                } else {
                  setPhase("complete");
                  if (calloutRef.current) clearTimeout(calloutRef.current);
                  return 0;
                }
              } else {
                // End of rest
                setCurrentRound((r) => r + 1);
                setPhase("round");
                // Schedule first callout of new round
                setTimeout(() => {
                  const currentSet = getCurrentPatternSet();
                  const randomPattern = currentSet.patterns[Math.floor(Math.random() * currentSet.patterns.length)];
                  setCurrentPattern(randomPattern);
                  setFlashActive(true);
                  speakPattern(randomPattern);
                  setTimeout(() => setFlashActive(false), 500);
                  scheduleCallout();
                }, 2000);
                return config.minutesPerRound * 60;
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
  }, [phase, config, patternSets, scheduleCallout, speakPattern]);

  // Reset to setup
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

  // Update config helpers
  const updateConfig = (key: keyof TrainingConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Pattern Set Management Functions
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
    if (setToDelete?.isDefault) return; // Can't delete default sets

    const newSets = patternSets.filter(s => s.id !== setId);
    setPatternSets(newSets);

    // If we deleted the selected set, select the first available
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
          // Check if pattern already exists
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

  const formatPattern = (pattern: Pattern) => pattern.join(" ");

  // Encode a pattern set to base64 for sharing
  const encodePatternSet = (set: PatternSet): string => {
    const data = {
      n: set.name,
      p: set.patterns,
    };
    const json = JSON.stringify(data);
    // Use btoa for base64 encoding (works in browsers)
    if (typeof window !== "undefined") {
      return btoa(json);
    }
    return "";
  };

  // Decode a base64 string to a pattern set
  const decodePatternSet = (base64: string): PatternSet | null => {
    try {
      if (typeof window !== "undefined") {
        const json = atob(base64);
        const data = JSON.parse(json);
        if (data.n && Array.isArray(data.p)) {
          return {
            id: `imported-${Date.now()}`,
            name: data.n,
            patterns: data.p,
          };
        }
      }
    } catch {
      // Invalid base64 or malformed data
    }
    return null;
  };

  // Share a pattern set - generate URL and show modal
  const sharePatternSet = (set: PatternSet) => {
    const encoded = encodePatternSet(set);
    if (encoded && typeof window !== "undefined") {
      const url = `${window.location.origin}${window.location.pathname}?import=${encoded}`;
      setShareUrl(url);
      setShowShareModal(true);
      setCopySuccess(false);
    }
  };

  // Copy share URL to clipboard
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  };

  // Import a shared pattern set
  const importSharedSet = (set: PatternSet) => {
    // Check if a set with this name already exists
    const existingIndex = patternSets.findIndex(s => s.name === set.name);
    let newSet = { ...set };

    if (existingIndex >= 0) {
      // Append number to make name unique
      const baseName = set.name;
      let counter = 1;
      while (patternSets.some(s => s.name === `${baseName} (${counter})`)) {
        counter++;
      }
      newSet.name = `${baseName} (${counter})`;
    }

    setPatternSets([...patternSets, newSet]);
    setSharedSetPreview(null);

    // Update URL to remove import param without reloading
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("import");
      window.history.replaceState({}, "", url);
    }
  };

  // Cancel import preview
  const cancelImport = () => {
    setSharedSetPreview(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("import");
      window.history.replaceState({}, "", url);
    }
  };

  // Generate a random pattern of specified length
  const generateRandomPattern = (length: number): Pattern => {
    const pattern: Pattern = [];
    for (let i = 0; i < length; i++) {
      // Generate numbers 1-4 for boxing combinations
      pattern.push(Math.floor(Math.random() * 4) + 1);
    }
    return pattern;
  };

  // Generate a random pattern set
  const generateRandomPatternSet = () => {
    const setSize = Math.floor(Math.random() * 6) + 3; // 3-8 patterns
    const patterns: Pattern[] = [];

    for (let i = 0; i < setSize; i++) {
      // Pattern length: 50% single, 30% double, 15% triple, 5% quadruple
      const rand = Math.random();
      let length: number;
      if (rand < 0.5) length = 1;
      else if (rand < 0.8) length = 2;
      else if (rand < 0.95) length = 3;
      else length = 4;

      const newPattern = generateRandomPattern(length);
      // Avoid duplicates
      const isDuplicate = patterns.some(p => JSON.stringify(p) === JSON.stringify(newPattern));
      if (!isDuplicate) {
        patterns.push(newPattern);
      } else {
        // Try once more with different length
        const altLength = length === 1 ? 2 : 1;
        const altPattern = generateRandomPattern(altLength);
        const isAltDuplicate = patterns.some(p => JSON.stringify(p) === JSON.stringify(altPattern));
        if (!isAltDuplicate) {
          patterns.push(altPattern);
        }
      }
    }

    const newSet: PatternSet = {
      id: `random-${Date.now()}`,
      name: `Random Set ${patternSets.filter(s => s.name.startsWith('Random Set')).length + 1}`,
      patterns,
    };

    setPatternSets([...patternSets, newSet]);
  };

  // Generate a set with specific constraints
  const generateCustomRandomSet = (options: { minPatterns?: number; maxPatterns?: number; allowSingles?: boolean; maxLength?: number }) => {
    const minPatterns = options.minPatterns ?? 3;
    const maxPatterns = options.maxPatterns ?? 8;
    const allowSingles = options.allowSingles ?? true;
    const maxLength = options.maxLength ?? 4;

    const setSize = Math.floor(Math.random() * (maxPatterns - minPatterns + 1)) + minPatterns;
    const patterns: Pattern[] = [];

    for (let i = 0; i < setSize; i++) {
      // Determine pattern length
      const minLen = allowSingles ? 1 : 2;
      const length = Math.floor(Math.random() * (maxLength - minLen + 1)) + minLen;

      const newPattern = generateRandomPattern(length);
      const isDuplicate = patterns.some(p => JSON.stringify(p) === JSON.stringify(newPattern));
      if (!isDuplicate) {
        patterns.push(newPattern);
      }
    }

    const newSet: PatternSet = {
      id: `custom-random-${Date.now()}`,
      name: `Custom Random ${patternSets.filter(s => s.name.startsWith('Custom Random')).length + 1}`,
      patterns,
    };

    setPatternSets([...patternSets, newSet]);
  };

  // Pattern Sets Management View
  if (phase === "setup" && setupView === "pattern-sets") {
    return (
      <main className="min-h-screen bg-void text-canvas p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-7xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
              PATTERN SETS
            </h1>
            <p className="text-rope-gray text-lg mt-2 tracking-widest uppercase" style={{ fontFamily: 'var(--font-oswald)' }}>
              Manage Your Training Patterns
            </p>
          </div>

          {/* Back Button */}
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
                placeholder="Set name (e.g., My Custom Set)"
                className="flex-1 bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas placeholder:text-rope-gray/50"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
              />
              <button
                onClick={createNewSet}
                disabled={!newSetName.trim()}
                className="px-6 py-2 bg-blood text-canvas rounded hover:bg-glove-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
              >
                CREATE
              </button>
            </div>

            {/* Random Pattern Generator */}
            <div className="border-t border-rope-gray/30 pt-4">
              <h3 className="text-lg uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Generate Random Set
              </h3>
              <p className="text-sm text-rope-gray/70 mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Creates a set with 3-8 random boxing combinations (1-4 punches)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generateRandomPatternSet}
                  className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                  style={{ fontFamily: 'var(--font-oswald)' }}
                >
                  🎲 FULLY RANDOM
                </button>
                <button
                  onClick={() => generateCustomRandomSet({ minPatterns: 4, maxPatterns: 6, allowSingles: true, maxLength: 2 })}
                  className="px-4 py-2 bg-concrete text-canvas rounded hover:bg-rope-gray transition-colors"
                  style={{ fontFamily: 'var(--font-oswald)' }}
                >
                  🥊 SINGLES & DOUBLES
                </button>
                <button
                  onClick={() => generateCustomRandomSet({ minPatterns: 3, maxPatterns: 5, allowSingles: false, maxLength: 4 })}
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
                <p className="text-rope-gray mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
                  Someone has shared a pattern set with you:
                </p>

                <div className="bg-void rounded-lg p-4 mb-6 border border-rope-gray/30">
                  <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
                    {sharedSetPreview.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sharedSetPreview.patterns.map((pattern, idx) => (
                      <span
                        key={idx}
                        className="text-sm bg-concrete border border-rope-gray/50 rounded px-2 py-1"
                        style={{ fontFamily: 'var(--font-bebas)' }}
                      >
                        {formatPattern(pattern)}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-rope-gray mt-2">
                    {sharedSetPreview.patterns.length} patterns
                  </p>
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
                <p className="text-rope-gray mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
                  Copy this link to share your pattern set with others:
                </p>

                <div className="bg-void rounded-lg p-4 mb-4 border border-rope-gray/30">
                  <code className="text-sm break-all text-canvas" style={{ fontFamily: 'monospace' }}>
                    {shareUrl}
                  </code>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyShareUrl}
                    className={`flex-1 px-4 py-3 rounded transition-colors ${copySuccess
                      ? 'bg-green-600 text-canvas'
                      : 'bg-ring-gold text-void hover:bg-ring-gold/80'
                      }`}
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
              <div
                key={set.id}
                className={`bg-concrete/30 rounded-lg p-6 border ${config.selectedPatternSetId === set.id ? 'border-blood' : 'border-rope-gray/30'}`}
              >

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl" style={{ fontFamily: 'var(--font-bebas)' }}>
                      {set.name}
                    </h3>
                    {set.isDefault && (
                      <span className="text-xs bg-rope-gray/30 text-rope-gray px-2 py-1 rounded" style={{ fontFamily: 'var(--font-oswald)' }}>
                        DEFAULT
                      </span>
                    )}
                    {config.selectedPatternSetId === set.id && (
                      <span className="text-xs bg-blood/30 text-blood px-2 py-1 rounded" style={{ fontFamily: 'var(--font-oswald)' }}>
                        SELECTED
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => updateConfig("selectedPatternSetId", set.id)}
                      className={`px-4 py-2 rounded transition-colors ${config.selectedPatternSetId === set.id
                        ? 'bg-blood text-canvas'
                        : 'border border-blood text-blood hover:bg-blood hover:text-canvas'
                        }`}
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

                {/* Patterns Display */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {set.patterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-void border border-rope-gray/50 rounded px-3 py-2"
                    >
                      <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}>
                        {formatPattern(pattern)}
                      </span>
                      {editingSet?.id === set.id && (
                        <button
                          onClick={() => removePatternFromSet(set.id, pattern)}
                          className="text-rope-gray hover:text-blood transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Pattern Input (when editing) */}
                {editingSet?.id === set.id && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPatternInput}
                      onChange={(e) => setNewPatternInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPatternToSet(set.id)}
                      placeholder="e.g., 1 1 2"
                      className="flex-1 bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas placeholder:text-rope-gray/50"
                      style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                    />
                    <button
                      onClick={() => addPatternToSet(set.id)}
                      className="px-4 py-2 bg-blood text-canvas rounded hover:bg-glove-red transition-colors"
                      style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                    >
                      ADD PATTERN
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

  // Main Setup View
  if (phase === "setup") {
    const currentSet = getCurrentPatternSet();

    return (
      <main className="min-h-screen bg-void text-canvas p-6 md:p-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-7xl md:text-9xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
              BAGRESPONSE
            </h1>
            <p className="text-rope-gray text-lg mt-4 tracking-widest uppercase" style={{ fontFamily: 'var(--font-oswald)' }}>
              Precision Training System
            </p>
          </div>

          {/* Configuration Form */}
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

            {/* Minutes per Round */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Minutes per Round:{" "}
                <span className="text-blood">{config.minutesPerRound}</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={config.minutesPerRound}
                onChange={(e) =>
                  updateConfig("minutesPerRound", parseFloat(e.target.value))
                }
              />
            </div>

            {/* Rest Period */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Rest Between Rounds:{" "}
                <span className="text-blood">{config.restSeconds}s</span>
              </label>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={config.restSeconds}
                onChange={(e) =>
                  updateConfig("restSeconds", parseInt(e.target.value))
                }
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
                  <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.5rem' }}>
                    {currentSet.name}
                  </span>
                  <span className="text-sm text-rope-gray" style={{ fontFamily: 'var(--font-oswald)' }}>
                    {currentSet.patterns.length} patterns
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentSet.patterns.slice(0, 5).map((p, i) => (
                    <span key={i} className="text-xs text-rope-gray bg-concrete/50 px-2 py-1 rounded">
                      {formatPattern(p)}
                    </span>
                  ))}
                  {currentSet.patterns.length > 5 && (
                    <span className="text-xs text-rope-gray">+{currentSet.patterns.length - 5} more</span>
                  )}
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

            {/* Callout Delay */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Callout Delay: <span className="text-blood">{config.baseDelay}s</span> to{" "}
                <span className="text-blood">{config.baseDelay + config.delayVariance}s</span>
                <span className="text-rope-gray/70 text-xs ml-2">
                  (minimum {config.baseDelay}s, up to +{config.delayVariance}s variance)
                </span>
              </label>

              {/* Base Delay Slider */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-rope-gray mb-1">
                  <span>Minimum Delay</span>
                  <span className="text-blood">{config.baseDelay}s</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={config.baseDelay}
                  onChange={(e) => updateConfig("baseDelay", parseInt(e.target.value))}
                />
              </div>

              {/* Delay Variance Slider */}
              <div>
                <div className="flex justify-between text-xs text-rope-gray mb-1">
                  <span>Variance (added to minimum)</span>
                  <span className="text-blood">+{config.delayVariance}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={config.delayVariance}
                  onChange={(e) => updateConfig("delayVariance", parseInt(e.target.value))}
                />
              </div>
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

        {/* Import Preview Modal (also shown on main view) */}
        {sharedSetPreview && (
          <div className="fixed inset-0 bg-void/90 flex items-center justify-center p-4 z-50">
            <div className="bg-concrete rounded-lg p-8 max-w-md w-full border border-ring-gold">
              <h2 className="text-3xl mb-4 text-ring-gold" style={{ fontFamily: 'var(--font-bebas)' }}>
                IMPORT PATTERN SET
              </h2>
              <p className="text-rope-gray mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
                Someone has shared a pattern set with you:
              </p>

              <div className="bg-void rounded-lg p-4 mb-6 border border-rope-gray/30">
                <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-bebas)' }}>
                  {sharedSetPreview.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sharedSetPreview.patterns.map((pattern, idx) => (
                    <span
                      key={idx}
                      className="text-sm bg-concrete border border-rope-gray/50 rounded px-2 py-1"
                      style={{ fontFamily: 'var(--font-bebas)' }}
                    >
                      {formatPattern(pattern)}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-rope-gray mt-2">
                  {sharedSetPreview.patterns.length} patterns
                </p>
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
      </main>
    );
  }

  // Training complete view
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
    <main
      className={`h-screen overflow-hidden ${phase === "rest" ? "rest-period" : "bg-void"
        } text-canvas flex flex-col items-center justify-center p-4 relative ${flashActive ? "callout-flash" : ""
        }`}
    >
      {/* Round Indicators */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 flex-wrap justify-center max-w-full px-4">
        {Array.from({ length: config.rounds }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${i < currentRound - 1
              ? "round-complete"
              : i === currentRound - 1
                ? phase === "round"
                  ? "round-active animate-pulse"
                  : "round-complete"
                : "round-pending"
              }`}
          />
        ))}
      </div>

      {/* Round Counter */}
      <div className="text-center mb-4">
        <p className="text-rope-gray uppercase tracking-widest text-xl md:text-2xl" style={{ fontFamily: 'var(--font-oswald)' }}>
          {phase === "rest" ? "REST PERIOD" : `ROUND ${currentRound} OF ${config.rounds}`}
        </p>
      </div>

      {/* Timer */}
      <div className="text-center mb-8">
        <div
          className={`text-[8rem] md:text-[10rem] leading-none ${phase === "round" ? "timer-active text-canvas" : "text-ring-gold"
            }`}
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Current Pattern */}
      {phase === "round" && (
        <div className="text-center mb-8 ring-rope py-6 px-12">
          <p className="text-rope-gray uppercase tracking-widest text-sm mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
            Current Pattern
          </p>
          <div
            className={`text-[6rem] md:text-[8rem] leading-none text-blood transition-all duration-200 ${flashActive ? "scale-110" : "scale-100"
              }`}
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {currentPattern ? formatPattern(currentPattern) : "—"}
          </div>
        </div>
      )}

      {/* Playback Speed Control */}
      <div className="mb-6 w-full max-w-xs">
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
      <div className="flex gap-4">
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
