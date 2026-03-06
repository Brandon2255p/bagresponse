// Voice options for callouts
export type VoiceOption = "man_1" | "man_2" | "woman_1" | "woman_2";

export const VOICE_OPTIONS: { value: VoiceOption; label: string }[] = [
    { value: "man_1", label: "Male Voice 1" },
    { value: "man_2", label: "Male Voice 2" },
    { value: "woman_1", label: "Female Voice 1" },
    { value: "woman_2", label: "Female Voice 2" },
];

// File extension for each voice
export const VOICE_EXTENSIONS: Record<VoiceOption, string> = {
    man_1: "wav",
    man_2: "mp3",
    woman_1: "mp3",
    woman_2: "mp3",
};

export function getVoicePath(voice: VoiceOption, value: number | string): string {
    const extension = VOICE_EXTENSIONS[voice];

    // Handle string commands (head, body, beep)
    if (typeof value === 'string') {
        // Map string commands to numeric values for audio files
        // head = 11, body = 12, beep = 13
        const commandMap: Record<string, number> = {
            'head': 11,
            'body': 12,
            'beep': 13,
        };
        const num = commandMap[value.toLowerCase()];
        if (num) {
            return `/sounds/${voice}/${num}.${extension}`;
        }
        return '';
    }

    return `/sounds/${voice}/${value}.${extension}`;
}
