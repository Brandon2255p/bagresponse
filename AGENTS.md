# BagResponse - AI Agent Documentation

This document provides comprehensive information about the BagResponse codebase for AI agents and developers working on the project.

## Project Purpose

BagResponse is a Progressive Web App for boxing training that provides voice-guided punch combination callouts during training rounds. It allows users to customize their training sessions with specific patterns, timing, and audio preferences.

## Core Concepts

### Training Flow
1. **Setup Phase**: User configures rounds, duration, rest periods, and selects a pattern set
2. **Countdown**: 3-second countdown with start beeps before first round
3. **Round Phase**: Active training with random pattern callouts at configured intervals
4. **Rest Phase**: Rest period between rounds with optional start beeps at 3 seconds
5. **Complete**: All rounds finished, option to restart

### Pattern System
- **Pattern**: Array of numbers representing punches (e.g., `[1, 2, 3]` = jab-cross-lead hook)
- **PatternSet**: Collection of patterns with metadata (id, name, patterns array, isDefault flag)
- **Pattern Sharing**: URL-based sharing using base64-encoded pattern sets via `?import=` query param

### Audio Architecture
- **Voice Callouts**: Pre-recorded audio files played sequentially or simultaneously
- **Web Audio Beeps**: Programmatically generated beeps for round transitions
- **Playback Modes**:
  - Sequential (0ms overlap): Numbers play one after another
  - Overlapping (1-999ms): Numbers overlap for faster combinations
  - Simultaneous (1000ms+): All numbers fire at once with 80ms stagger

## Code Organization

### File Responsibilities

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/lib/config.ts` | Training configuration types and defaults | `TrainingConfig`, `DEFAULT_CONFIG`, storage keys |
| `src/lib/patterns.ts` | Pattern set management and sharing | `Pattern`, `PatternSet`, encoding/decoding functions |
| `src/lib/voices.ts` | Voice option definitions | `VoiceOption`, `VOICE_OPTIONS`, `getVoicePath()` |
| `src/lib/audio.ts` | Audio playback hook | `useAudio()` hook with speak/stop/setPaused |
| `src/lib/beeps.ts` | Round beep generation | `useBeeps()` hook with Web Audio API |
| `src/lib/index.ts` | Module barrel exports | Re-exports all lib modules |
| `src/app/page.tsx` | Main UI component (~1000 lines) | `Home()` component with all views |
| `src/app/layout.tsx` | Root layout | Metadata, fonts, viewport settings |
| `src/app/globals.css` | Global styles | CSS variables, animations, component styles |
| `public/service-worker.js` | Audio caching | Caches voice files for offline playback |

### State Management

The app uses React hooks for state management:

```typescript
// Core state in page.tsx
const [config, setConfig] = useState(DEFAULT_CONFIG);           // Training settings
const [patternSets, setPatternSets] = useState(DEFAULT_PATTERN_SETS); // All pattern sets
const [phase, setPhase] = useState<Phase>("setup");             // Current phase
const [setupView, setSetupView] = useState<SetupView>("main");  // Sub-view in setup
const [currentRound, setCurrentRound] = useState(1);          // Current round number
const [timeRemaining, setTimeRemaining] = useState(0);        // Timer in seconds
const [currentPattern, setCurrentPattern] = useState<Pattern | null>(null); // Active pattern
const [isPaused, setIsPaused] = useState(false);              // Pause state
const [flashActive, setFlashActive] = useState(false);        // Visual flash trigger
```

### Persistence

Data is persisted to `localStorage`:
- `STORAGE_KEY_CONFIG` (`bagresponse-settings`): Training configuration
- `STORAGE_KEY_PATTERN_SETS` (`bagresponse-pattern-sets`): Custom pattern sets

Default pattern sets are always available and merged with user-created sets.

## Key Technical Details

### Audio Playback Flow

```
speakPattern(pattern)
  ├── If audioOverlap >= 1000: Simultaneous mode
  │   └── Create audio elements for each number
  │       └── Play all with 80ms stagger
  └── Else: Sequential mode
      └── For each number:
          ├── Load audio file
          ├── Wait for canplaythrough
          ├── Play audio
          └── Wait for completion (with overlap if configured)
```

### Timer Architecture

Uses `setInterval` with refs to track mutable state:
- `timerRef`: Main 1-second countdown timer
- `calloutRef`: Next pattern callout timeout
- `phaseRef`, `isPausedRef`, `currentRoundRef`: Ref mirrors for timer callback access

**Important**: Timer callback reads from refs, not state, to avoid closure staleness issues.

### Pattern Set Sharing Algorithm

```typescript
// Encoding
const data = { n: set.name, p: set.patterns };  // Minified keys
const base64 = btoa(JSON.stringify(data));     // Base64 encode
// URL: ?import=<base64>

// Decoding
const json = atob(base64);
const data = JSON.parse(json);
return { id: `imported-${Date.now()}`, name: data.n, patterns: data.p };
```

### Round Transition Logic

```
Round End (prev === 1):
  ├── If more rounds: Enter rest phase
  │   ├── Play end beeps at 5 seconds remaining
  │   ├── If rest < 3s: Play start beeps immediately
  │   └── At rest end: Increment round, enter round phase
  └── Else: Enter complete phase
```

## Styling System

### CSS Variables (Theme)

```css
--void: #0d0d0d;          /* Background */
--canvas: #f5f5f5;        /* Text */
--blood: #e63946;         /* Primary accent (buttons, active states) */
--blood-dark: #c62828;    /* Hover states */
--ring-gold: #d4af37;    /* Secondary accent (success, highlights) */
--concrete: #2a2a2a;      /* Card backgrounds */
--rope-gray: #4a4a4a;     /* Borders, secondary text */
--glove-red: #ff2e2e;     /* Bright accent */
--timer-glow: rgba(230, 57, 70, 0.3); /* Glow effects */
```

### Typography

- **Headings**: Bebas Neue (variable: `--font-bebas`)
- **Body/UI**: Oswald (variable: `--font-oswald`)

### Animation Classes

| Class | Purpose |
|-------|---------|
| `.timer-active` | Pulsing glow animation for active timer |
| `.callout-flash` | Flash effect when pattern is called |
| `.round-active` | Active round indicator style |
| `.round-complete` | Completed round indicator style |
| `.round-pending` | Pending round indicator style |
| `.btn-glow` | Hover glow effect for buttons |
| `.ring-rope` | Gold gradient borders (top/bottom) |
| `.blood-accent` | Decorative red underline |

## Common Development Tasks

### Adding a New Voice

1. Add audio files to `public/sounds/<voice_name>/` (1-8.<ext>)
2. Add entry to `VOICE_OPTIONS` in `src/lib/voices.ts`
3. Add file extension to `VOICE_EXTENSIONS`
4. Update `AUDIO_FILES` in `public/service-worker.js`
5. Test in browser with service worker enabled

**Example**: Adding `woman_2` voice (MP3 format):

```typescript
// src/lib/voices.ts
export type VoiceOption = "man_1" | "man_2" | "woman_1" | "woman_2";

export const VOICE_OPTIONS = [
    { value: "man_1", label: "Male Voice 1" },
    { value: "man_2", label: "Male Voice 2" },
    { value: "woman_1", label: "Female Voice 1" },
    { value: "woman_2", label: "Female Voice 2" },  // Add this
];

export const VOICE_EXTENSIONS: Record<VoiceOption, string> = {
    man_1: "wav",
    man_2: "mp3",
    woman_1: "mp3",
    woman_2: "mp3",  // Add this
};
```

```javascript
// public/service-worker.js - Add to AUDIO_FILES array
'/sounds/woman_2/1.mp3',
'/sounds/woman_2/2.mp3',
'/sounds/woman_2/3.mp3',
'/sounds/woman_2/4.mp3',
'/sounds/woman_2/5.mp3',
'/sounds/woman_2/6.mp3',
'/sounds/woman_2/7.mp3',
'/sounds/woman_2/8.mp3',
```

Place audio files in `public/sounds/woman_2/1.mp3` through `8.mp3`.

### Adding a New Default Pattern Set

1. Add to `DEFAULT_PATTERN_SETS` in `src/lib/patterns.ts`
2. Include `isDefault: true`
3. Use kebab-case for ID

### Modifying Training Configuration

1. Add field to `TrainingConfig` interface in `src/lib/config.ts`
2. Add default value to `DEFAULT_CONFIG`
3. Add persistence handling in `page.tsx` useEffect (if needed)
4. Add UI control in appropriate setup view

### Adding a New Phase or Setup View

1. Add to type union in `src/lib/config.ts`
2. Add view rendering block in `page.tsx` (search for `if (phase === "setup" && setupView === "...")`)
3. Add navigation button in main setup view

## Important Implementation Notes

### Audio Context Requirements

Web Audio API requires user interaction to start. The app:
- Creates AudioContext on mount in `useBeeps`
- May need user to click START before audio works (browser security)

### Service Worker Considerations

- Audio files are cached on install
- Cache name changes require SW update
- Fetch handler only caches `/sounds/` requests
- SW must be registered in `ServiceWorkerRegistration.tsx`

### State Synchronization

The app maintains ref copies of state for timer callbacks:
```typescript
phaseRef.current = phase;
isPausedRef.current = isPaused;
currentRoundRef.current = currentRound;
```

Always update refs when state changes to ensure timer sees current values.

### Pattern Formatting

Patterns are displayed as space-separated numbers: `formatPattern([1, 2, 3])` → `"1 2 3"`

### Mobile Considerations

- Touch targets should be at least 44px
- PWA install prompt handled by `InstallPrompt.tsx`
- Audio may be muted until user interaction on iOS

## Debugging Tips

### Audio Issues
1. Check browser console for audio load errors
2. Verify audio files exist in `public/sounds/`
3. Check Network tab for 404s on audio requests
4. Test with browser autoplay policies disabled

### Timer Issues
1. Add logging in the `setInterval` callback
2. Check ref values match expected state
3. Verify `clearInterval` is called appropriately
4. Test pause/resume cycle thoroughly

### Pattern Set Issues
1. Check localStorage in DevTools Application tab
2. Verify JSON parse/stringify handling
3. Test import with malformed base64 strings
4. Check for duplicate ID handling

## Architecture Decisions

### Why useAudio Hook?
The audio logic is complex (sequential vs simultaneous modes, overlap timing, pause handling) and needs to be reusable. Hook encapsulates all audio state and provides clean API.

### Why Refs for Timer?
React state closures in `setInterval` callbacks become stale. Refs provide mutable references that always reflect current state.

### Why Base64 for Sharing?
- No server required
- URL-safe encoding
- Compact representation
- Copy-paste friendly

### Why LocalStorage?
- Simple persistence without backend
- Works offline
- Fast reads/writes
- Suitable for small data (config + pattern sets)

## Testing Checklist

When making changes, verify:
- [ ] Training starts and completes all rounds
- [ ] Pause/resume works correctly
- [ ] Audio plays at correct speed
- [ ] Pattern sets can be created, edited, deleted
- [ ] Pattern sharing import works
- [ ] Settings persist after refresh
- [ ] Service worker caches audio files
- [ ] PWA install works on mobile
- [ ] Timer displays correctly in all phases
- [ ] Flash animation triggers on pattern callout
- [ ] Round indicators update correctly

## File Size Guidelines

- `page.tsx`: Currently ~1000 lines, consider splitting if growing
- Hooks: Keep focused on single responsibility
- Utilities: Extract pure functions to appropriate lib files
- Components: Extract repeated UI patterns to `src/components/`

## Dependencies

### Runtime
- `next`: React framework
- `react`/`react-dom`: UI library

### Development
- `typescript`: Type safety
- `tailwindcss`: Styling
- `eslint`: Code quality

No external state management, audio libraries, or UI component libraries are used. Keep it that way unless there's a compelling reason.
