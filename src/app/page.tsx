"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// A pattern is a sequence of numbers (e.g., [1, 1, 2] or [1, 2])
type Pattern = number[];

interface TrainingConfig {
  rounds: number;
  minutesPerRound: number;
  restSeconds: number;
  patterns: Pattern[];
  minDelay: number;
  maxDelay: number;
}

type Phase = "setup" | "round" | "rest" | "complete";

// Predefined pattern sets
const DEFAULT_PATTERNS: Pattern[] = [
  [1], [2], [3], [4], [5], [6], [7], [8]
];

export default function Home() {
  // Training configuration
  const [config, setConfig] = useState<TrainingConfig>({
    rounds: 10,
    minutesPerRound: 2,
    restSeconds: 30,
    patterns: [...DEFAULT_PATTERNS],
    minDelay: 2,
    maxDelay: 5,
  });

  // Training state
  const [phase, setPhase] = useState<Phase>("setup");
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  // Pattern builder state
  const [newPatternInput, setNewPatternInput] = useState("");

  // Refs for timer management
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const calloutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
    }
  }, []);

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
        const playPromise = audioRef.current.play();
        playPromiseRef.current = playPromise;
        await playPromise;

        // Small pause between numbers in a pattern
        if (pattern.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 400));
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

    const delay =
      Math.random() * (config.maxDelay - config.minDelay) + config.minDelay;

    calloutRef.current = setTimeout(() => {
      // Check again when timeout fires in case we paused while waiting
      if (isPausedRef.current) return;

      setCurrentPattern((prevPattern) => {
        const availablePatterns = config.patterns.filter(
          (p) => JSON.stringify(p) !== JSON.stringify(prevPattern)
        );
        const patternsToChooseFrom = availablePatterns.length > 0 ? availablePatterns : config.patterns;
        const randomPattern = patternsToChooseFrom[Math.floor(Math.random() * patternsToChooseFrom.length)];
        setFlashActive(true);
        speakPattern(randomPattern);
        setTimeout(() => setFlashActive(false), 500);
        return randomPattern;
      });

      // Schedule next callout
      scheduleCallout();
    }, delay * 1000);
  }, [config, speakPattern]);

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

    // Initial callout after short delay
    setTimeout(() => {
      const randomPattern = config.patterns[Math.floor(Math.random() * config.patterns.length)];
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
                  const randomPattern = config.patterns[Math.floor(Math.random() * config.patterns.length)];
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
  }, [phase, config, scheduleCallout, speakPattern]);

  // Reset to setup
  const resetTraining = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (calloutRef.current) clearTimeout(calloutRef.current);
    setPhase("setup");
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
  const updateConfig = (key: keyof TrainingConfig, value: number | Pattern[]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Add a new pattern from input
  const addPattern = () => {
    const nums = newPatternInput
      .trim()
      .split(/\s+/)
      .map(n => parseInt(n))
      .filter(n => !isNaN(n) && n >= 1 && n <= 10);

    if (nums.length > 0) {
      // Check if pattern already exists
      const patternExists = config.patterns.some(
        p => JSON.stringify(p) === JSON.stringify(nums)
      );
      if (!patternExists) {
        updateConfig("patterns", [...config.patterns, nums]);
      }
      setNewPatternInput("");
    }
  };

  // Remove a pattern
  const removePattern = (patternToRemove: Pattern) => {
    if (config.patterns.length > 1) {
      updateConfig(
        "patterns",
        config.patterns.filter(p => JSON.stringify(p) !== JSON.stringify(patternToRemove))
      );
    }
  };

  // Format pattern for display
  const formatPattern = (pattern: Pattern) => pattern.join(" ");

  // Setup view
  if (phase === "setup") {
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

            {/* Pattern Sets */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Pattern Sets
              </label>

              {/* Pattern Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newPatternInput}
                  onChange={(e) => setNewPatternInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPattern()}
                  placeholder="e.g., 1 1 2"
                  className="flex-1 bg-void border border-rope-gray/50 rounded px-3 py-2 text-canvas placeholder:text-rope-gray/50"
                  style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                />
                <button
                  onClick={addPattern}
                  className="px-4 py-2 bg-blood text-canvas rounded hover:bg-glove-red transition-colors"
                  style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}
                >
                  ADD
                </button>
              </div>

              {/* Pattern List */}
              <div className="flex flex-wrap gap-2">
                {config.patterns.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-void border border-rope-gray/50 rounded px-3 py-2"
                  >
                    <span style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.25rem' }}>
                      {formatPattern(pattern)}
                    </span>
                    {config.patterns.length > 1 && (
                      <button
                        onClick={() => removePattern(pattern)}
                        className="text-rope-gray hover:text-blood transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-rope-gray mt-2">
                Enter patterns like "1 1 2", "1 2", or "1 2 1 2"
              </p>
            </div>

            {/* Callout Delay */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Callout Delay: <span className="text-blood">{config.minDelay}</span>s -{" "}
                <span className="text-blood">{config.maxDelay}</span>s
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <span className="text-xs text-rope-gray">Min</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={config.minDelay}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val <= config.maxDelay) {
                        updateConfig("minDelay", val);
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-rope-gray">Max</span>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={config.maxDelay}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= config.minDelay) {
                        updateConfig("maxDelay", val);
                      }
                    }}
                  />
                </div>
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
      className={`min-h-screen ${phase === "rest" ? "rest-period" : "bg-void"
        } text-canvas flex flex-col items-center justify-center p-6 relative ${flashActive ? "callout-flash" : ""
        }`}
    >
      {/* Round Indicators */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1 flex-wrap justify-center max-w-full px-4">
        {Array.from({ length: config.rounds }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${i < currentRound - 1
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
      <div className="text-center mb-8">
        <p className="text-rope-gray uppercase tracking-widest text-sm mb-2" style={{ fontFamily: 'var(--font-oswald)' }}>
          {phase === "rest" ? "REST PERIOD" : `ROUND ${currentRound} OF ${config.rounds}`}
        </p>
      </div>

      {/* Timer */}
      <div className="text-center mb-12">
        <div
          className={`text-[12rem] md:text-[16rem] leading-none ${phase === "round" ? "timer-active text-canvas" : "text-ring-gold"
            }`}
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Current Pattern */}
      {phase === "round" && (
        <div className="text-center mb-12 ring-rope py-8 px-16">
          <p className="text-rope-gray uppercase tracking-widest text-sm mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
            Current Pattern
          </p>
          <div
            className={`text-[8rem] md:text-[10rem] leading-none text-blood transition-all duration-200 ${flashActive ? "scale-110" : "scale-100"
              }`}
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {currentPattern ? formatPattern(currentPattern) : "—"}
          </div>
        </div>
      )}

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

      {/* Status Text */}
      <p className="absolute bottom-8 text-rope-gray text-sm uppercase tracking-widest" style={{ fontFamily: 'var(--font-oswald)' }}>
        {isPaused ? "PAUSED" : phase === "rest" ? "RECOVER" : "TRAINING IN PROGRESS"}
      </p>
    </main>
  );
}
