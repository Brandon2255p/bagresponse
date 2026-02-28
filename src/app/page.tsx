"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TrainingConfig {
  rounds: number;
  minutesPerRound: number;
  restSeconds: number;
  numbers: number[];
  minDelay: number;
  maxDelay: number;
}

type Phase = "setup" | "round" | "rest" | "complete";

export default function Home() {
  // Training configuration
  const [config, setConfig] = useState<TrainingConfig>({
    rounds: 10,
    minutesPerRound: 2,
    restSeconds: 30,
    numbers: [1, 2, 3, 4, 5, 6],
    minDelay: 2,
    maxDelay: 5,
  });

  // Training state
  const [phase, setPhase] = useState<Phase>("setup");
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentCallout, setCurrentCallout] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

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

  // Speak a number using local audio files
  const speakNumber = useCallback(async (num: number) => {
    if (!audioRef.current || isPausedRef.current) return;

    try {
      // Wait for any pending play to settle before pausing
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

      setCurrentCallout((prevCallout) => {
        const availableNumbers = config.numbers.filter(
          (n) => n !== prevCallout
        );
        const randomNum =
          availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
        setFlashActive(true);
        speakNumber(randomNum);
        setTimeout(() => setFlashActive(false), 500);
        return randomNum;
      });

      // Schedule next callout
      scheduleCallout();
    }, delay * 1000);
  }, [config, speakNumber]);

  // Resume callouts when unpausing during a round
  useEffect(() => {
    if (!isPaused && phase === "round" && currentCallout !== null) {
      scheduleCallout();
    }
  }, [isPaused, phase, currentCallout, scheduleCallout]);

  // Start training
  const startTraining = () => {
    setCurrentRound(1);
    setPhase("round");
    setTimeRemaining(config.minutesPerRound * 60);
    setIsPaused(false);

    // Initial callout after short delay
    setTimeout(() => {
      const randomNum =
        config.numbers[Math.floor(Math.random() * config.numbers.length)];
      setCurrentCallout(randomNum);
      setFlashActive(true);
      speakNumber(randomNum);
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
                  const randomNum =
                    config.numbers[Math.floor(Math.random() * config.numbers.length)];
                  setCurrentCallout(randomNum);
                  setFlashActive(true);
                  speakNumber(randomNum);
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
  }, [phase, config, scheduleCallout, speakNumber]);

  // Reset to setup
  const resetTraining = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (calloutRef.current) clearTimeout(calloutRef.current);
    setPhase("setup");
    setCurrentRound(1);
    setTimeRemaining(0);
    setCurrentCallout(null);
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
  const updateConfig = (key: keyof TrainingConfig, value: number | number[]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Setup view
  if (phase === "setup") {
    return (
      <main className="min-h-screen bg-void text-canvas p-6 md:p-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-7xl md:text-9xl tracking-wider blood-accent" style={{ fontFamily: 'var(--font-bebas)' }}>
              BOXTRAIN
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

            {/* Numbers Selection */}
            <div className="mb-8">
              <label className="block text-sm uppercase tracking-widest text-rope-gray mb-3" style={{ fontFamily: 'var(--font-oswald)' }}>
                Numbers to Call
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      const newNumbers = config.numbers.includes(num)
                        ? config.numbers.filter((n) => n !== num)
                        : [...config.numbers, num].sort((a, b) => a - b);
                      if (newNumbers.length >= 2) {
                        updateConfig("numbers", newNumbers);
                      }
                    }}
                    className={`w-10 h-10 text-xl rounded transition-all ${config.numbers.includes(num)
                      ? "bg-blood text-canvas"
                      : "bg-void text-rope-gray border border-rope-gray/50"
                      }`}
                    style={{ fontFamily: 'var(--font-bebas)' }}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-xs text-rope-gray mt-2">
                Select at least 2 numbers
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

      {/* Current Callout */}
      {phase === "round" && (
        <div className="text-center mb-12 ring-rope py-8 px-16">
          <p className="text-rope-gray uppercase tracking-widest text-sm mb-4" style={{ fontFamily: 'var(--font-oswald)' }}>
            Current Number
          </p>
          <div
            className={`text-[10rem] md:text-[14rem] leading-none text-blood transition-all duration-200 ${flashActive ? "scale-110" : "scale-100"
              }`}
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {currentCallout ?? "—"}
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
