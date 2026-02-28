import type { VoiceOption } from './voices';

export interface TrainingConfig {
    rounds: number;
    roundSeconds: number;
    restSeconds: number;
    selectedPatternSetId: string;
    baseDelay: number;
    delayVariance: number;
    playbackSpeed: number;
    voice: VoiceOption;
    audioOverlap: number;
}

export const DEFAULT_CONFIG: TrainingConfig = {
    rounds: 10,
    roundSeconds: 120,
    restSeconds: 30,
    selectedPatternSetId: 'basic-1',
    baseDelay: 3,
    delayVariance: 2,
    playbackSpeed: 1.0,
    voice: 'man_1',
    audioOverlap: 0,
};

// Round time settings: min 30s, max 300s (5 min), step 15s
export const ROUND_TIME_MIN = 30;
export const ROUND_TIME_MAX = 300;
export const ROUND_TIME_STEP = 15;

export const STORAGE_KEY_CONFIG = 'bagresponse-settings';
export const STORAGE_KEY_PATTERN_SETS = 'bagresponse-pattern-sets';

export type Phase = 'setup' | 'round' | 'rest' | 'complete';
export type SetupView = 'main' | 'pattern-sets';
