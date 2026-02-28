# BagResponse

**Live App: https://bagresponse.openprocess.me/**

A high-intensity boxing training application with pattern-based audio callouts for punch combinations. Train like a pro with customizable rounds, voice-guided combinations, and a distraction-free interface designed for the gym.

## Overview

BagResponse is a Progressive Web App (PWA) designed for boxers and fitness enthusiasts who want structured heavy bag or shadow boxing workouts. The app calls out punch combinations (using standard boxing numbering: 1=jab, 2=cross, 3=lead hook, 4=rear hook, etc.) at random intervals, guiding you through intense training sessions without needing to look at your device.

## Features

### Training Configuration
- **Customizable Training Rounds**: Configure 1-20 rounds with adjustable duration (30 seconds to 5 minutes)
- **Rest Periods**: Set rest time between rounds (10-120 seconds)
- **Round Tracking**: Visual progress indicators showing completed, active, and pending rounds

### Pattern System
- **Pattern-Based Callouts**: Create custom punch combinations like "1 1 2" (double jab, cross), "1 2 3 4" (jab-cross-lead hook-rear hook)
- **Pattern Sets**: Organize combinations into named sets (Basic 1, Basic 2, Advanced, etc.)
- **Random Pattern Generation**: Generate random pattern sets with constraints (singles & doubles, combos only, fully random)
- **Pattern Set Management**: Create, edit, delete, and share custom pattern sets
- **Share & Import**: Share pattern sets via URL-encoded links that others can import with one click

### Audio System
- **Multiple Voice Options**: Choose from Male Voice 1, Male Voice 2, Female Voice 1, or Female Voice 2
- **Adjustable Playback Speed**: Speed up or slow down callouts (0.5x to 2.0x)
- **Audio Overlap Control**: Configure sequential playback (0ms) to simultaneous playback (1000ms+) for overlapping callouts
- **Round Start/End Beeps**: Audio cues signal round transitions (2 short + 1 long beep to start, 3 short + 1 long beep to end)
- **Audio Caching**: Service worker caches audio files for offline playback

### Training Interface
- **Visual Feedback**: Large, clear display of current patterns with flash animations
- **Pause/Resume**: Full control to pause and resume training at any time
- **Timer Display**: Large timer with active/rest state indicators
- **Quick Speed Adjustment**: Change playback speed mid-training without pausing
- **Distraction-Free Design**: Dark boxing-themed UI that stays out of your way

### PWA Features
- **Installable**: Add to home screen on iOS/Android for app-like experience
- **Offline Capable**: Audio files are cached for offline use
- **Responsive**: Works on phones, tablets, and desktop browsers
- **Standalone Mode**: Runs full-screen when installed

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Brandon2255p/bagresponse.git
cd bagresponse

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to start training.

### Building for Production

```bash
npm run build
npm start
```

## Usage

### Setting Up Your Training Session

1. **Configure rounds**: Set number of rounds (1-20), duration per round (0:30 to 5:00), and rest period
2. **Select a pattern set**: Choose from default sets or create your own
3. **Adjust audio settings**: Pick your preferred voice, playback speed, and overlap
4. **Set callout timing**: Configure base delay and variance for random intervals between callouts
5. Click **START TRAINING** to begin

### During Training

- Patterns are called out at random intervals based on your delay settings
- Throw the corresponding punch combination
- The current pattern displays prominently on screen
- Use **PAUSE/RESUME** to control the session
- Use **STOP** to end training early
- Adjust playback speed on the fly with the speed slider

### Managing Pattern Sets

1. Click **MANAGE SETS →** from the main screen
2. **Create New Set**: Enter a name and click CREATE
3. **Add Patterns**: Click EDIT on a set, then enter combinations (e.g., "1 2 3") and click ADD
4. **Generate Random**: Use the random generators for quick variety
5. **Share**: Click SHARE to copy a URL that others can use to import your set
6. **Import**: Open a shared URL to preview and import pattern sets

### Audio Settings Explained

- **Voice**: Select from 4 pre-recorded voice packs (Female Voice 2 is default)
- **Playback Speed**: Slow down for beginners, speed up for advanced training
- **Audio Overlap**:
  - 0ms: Sequential playback (numbers play one after another)
  - 100-900ms: Overlapping playback (numbers overlap slightly)
  - ≥1000ms: Simultaneous playback (all numbers at once with slight stagger)

## Boxing Number Reference

| Number | Punch |
|--------|-------|
| 1 | Jab (lead hand) |
| 2 | Cross (rear hand) |
| 3 | Lead Hook |
| 4 | Rear Hook |
| 5 | Lead Uppercut |
| 6 | Rear Uppercut |
| 7 | (Reserved) |
| 8 | (Reserved) |

## Audio Files

The app uses pre-recorded voice files located in `public/sounds/`:
- `man_1/`: Male voice 1 (WAV format)
- `man_2/`: Male voice 2 (MP3 format)
- `woman_1/`: Female voice 1 (MP3 format)
- `woman_2/`: Female voice 2 (MP3 format)

Each directory contains numbered files 1-8 corresponding to punch numbers.

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework with App Router
- [React 19](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first styling
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Round beep generation
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) - Audio caching and PWA support

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx       # Main training interface
│   │   ├── layout.tsx     # Root layout with fonts & metadata
│   │   └── globals.css    # Global styles & theme
│   ├── lib/               # Core logic
│   │   ├── audio.ts       # Audio playback hook
│   │   ├── beeps.ts       # Round beep generation
│   │   ├── config.ts      # Training configuration types & defaults
│   │   ├── patterns.ts    # Pattern set management & sharing
│   │   ├── voices.ts      # Voice option definitions
│   │   └── index.ts       # Module exports
│   └── components/        # React components
│       ├── InstallPrompt.tsx
│       └── ServiceWorkerRegistration.tsx
├── public/
│   ├── sounds/            # Voice audio files
│   ├── favicon/           # App icons
│   ├── manifest.json      # PWA manifest
│   └── service-worker.js  # Audio caching SW
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 11.3+ for PWA support)
- Mobile browsers with Web Audio API support

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built for fighters, by fighters. Stay sharp. 🥊
