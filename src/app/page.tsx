"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  type Pattern,
  type PatternSet,
  DEFAULT_PATTERN_SETS,
  generateRandomPatternSet,
  generateCustomRandomSet,
  encodePatternSet,
  decodePatternSet,
  importPatternSet,
  DEFAULT_CONFIG,
  STORAGE_KEY_CONFIG,
  STORAGE_KEY_PATTERN_SETS,
  type Phase,
  type TrainingConfig,
  useBeeps,
  useAudio,
} from "@/lib";

// Import SetupView type with alias to avoid conflict with component
import { type SetupView as SetupViewType } from "@/lib";

import {
  AudioSettingsView,
  CompleteView,
  PatternSetsView,
  SetupView,
  TrainingView,
} from "@/components";

export default function Home() {
  // Pattern sets state
  const [patternSets, setPatternSets] = useState<PatternSet[]>(DEFAULT_PATTERN_SETS);
  const [patternSetsLoaded, setPatternSetsLoaded] = useState(false);

  // Training configuration
  const [config, setConfig] = useState<TrainingConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Training state
  const [phase, setPhase] = useState<Phase>("setup");
  const [setupView, setSetupView] = useState<SetupViewType>("main");
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
            // Only play if rest period is >= 3 seconds (otherwise already played when entering rest)
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
                  // Reset start beeps ref when entering rest
                  // Play immediately if rest < 3s since timer won't hit the 3s mark
                  if (config.restSeconds < 3) {
                    playRoundStartBeeps();
                  } else {
                    // Reset ref so timer will trigger at 3s
                    startBeepsPlayingRef.current = false;
                  }
                  return config.restSeconds;
                } else {
                  setPhase("complete");
                  return 0;
                }
              } else {
                // End of rest - start round immediately (beeps already played at 3s or earlier)
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

  // Toggle pause
  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Update config
  const updateConfig = (key: keyof TrainingConfig, value: string | number) => {
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
    const tokens = newPatternInput
      .trim()
      .toLowerCase()
      .split(/\s+/);

    // Valid special commands
    const validCommands = ['head', 'body', 'beep'];

    const parsed = tokens.map(t => {
      const num = parseInt(t);
      if (!isNaN(num) && num >= 1 && num <= 10) {
        return num;
      }
      if (validCommands.includes(t)) {
        return t;
      }
      return null;
    }).filter(t => t !== null) as (number | string)[];

    if (parsed.length > 0) {
      setPatternSets(sets => sets.map(s => {
        if (s.id === setId) {
          const patternExists = s.patterns.some(
            p => JSON.stringify(p) === JSON.stringify(parsed)
          );
          if (!patternExists) {
            return { ...s, patterns: [...s.patterns, parsed] };
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

  const addRandomSet = (newSet: PatternSet) => {
    setPatternSets([...patternSets, newSet]);
  };

  // Render views based on phase and setupView
  if (phase === "setup" && setupView === "audio") {
    return (
      <AudioSettingsView
        config={config}
        updateConfig={updateConfig}
        onBack={() => setSetupView("main")}
      />
    );
  }

  if (phase === "setup" && setupView === "pattern-sets") {
    return (
      <PatternSetsView
        patternSets={patternSets}
        selectedPatternSetId={config.selectedPatternSetId}
        editingSet={editingSet}
        newSetName={newSetName}
        newPatternInput={newPatternInput}
        sharedSetPreview={sharedSetPreview}
        showShareModal={showShareModal}
        shareUrl={shareUrl}
        copySuccess={copySuccess}
        onBack={() => setSetupView("main")}
        onCreateNewSet={createNewSet}
        onSetNewSetName={setNewSetName}
        onAddPatternToSet={addPatternToSet}
        onSetNewPatternInput={setNewPatternInput}
        onRemovePatternFromSet={removePatternFromSet}
        onSelectPatternSet={(setId) => updateConfig("selectedPatternSetId", setId)}
        onSharePatternSet={sharePatternSet}
        onDeleteSet={deleteSet}
        onToggleEdit={setEditingSet}
        onImportSharedSet={() => sharedSetPreview && importSharedSet(sharedSetPreview)}
        onCancelImport={cancelImport}
        onCopyShareUrl={copyShareUrl}
        onCloseShareModal={() => setShowShareModal(false)}
        onAddRandomSet={addRandomSet}
      />
    );
  }

  if (phase === "setup") {
    return (
      <SetupView
        config={config}
        patternSets={patternSets}
        sharedSetPreview={sharedSetPreview}
        onUpdateConfig={updateConfig}
        onStartTraining={startTraining}
        onNavigateToPatternSets={() => setSetupView("pattern-sets")}
        onNavigateToAudio={() => setSetupView("audio")}
        onImportSharedSet={() => sharedSetPreview && importSharedSet(sharedSetPreview)}
        onCancelImport={cancelImport}
      />
    );
  }

  if (phase === "complete") {
    return (
      <CompleteView
        rounds={config.rounds}
        onResetTraining={resetTraining}
      />
    );
  }

  // Active training view
  return (
    <TrainingView
      phase={phase}
      currentRound={currentRound}
      timeRemaining={timeRemaining}
      currentPattern={currentPattern}
      isPaused={isPaused}
      flashActive={flashActive}
      config={config}
      onTogglePause={togglePause}
      onResetTraining={resetTraining}
      onUpdateConfig={updateConfig}
    />
  );
}
