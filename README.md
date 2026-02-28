# BoxTrain

A precision boxing training application with audio callouts for punch combinations.

## Features

- **Customizable Training Rounds**: Configure number of rounds, duration, and rest periods
- **Audio Callouts**: Randomized number callouts with configurable delays
- **Visual Feedback**: Large, clear display of current numbers with flash animations
- **Pause/Resume**: Full control to pause and resume training at any time
- **Round Tracking**: Visual progress indicators for completed and remaining rounds

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Brandon2255p/boxtraining.git
cd boxtraining

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

1. Configure your training session:
   - Set number of rounds (1-20)
   - Set minutes per round (1-5)
   - Set rest period between rounds (10-120 seconds)
   - Select which numbers to call (1-10)
   - Set min/max delay between callouts

2. Click **START TRAINING** to begin

3. During training:
   - Numbers will be called out at random intervals
   - Throw the corresponding punch combination
   - Use **PAUSE/RESUME** to control the session
   - Use **STOP** to end training early

## Audio Files

Place your audio files in `public/sounds/` named `1.wav` through `10.wav`. The app will use these for callouts.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## License

MIT License - see [LICENSE](LICENSE) file for details.
