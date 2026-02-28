// A pattern is a sequence of numbers (e.g., [1, 1, 2] or [1, 2])
export type Pattern = number[];

// A pattern set has a name and collection of patterns
export interface PatternSet {
    id: string;
    name: string;
    patterns: Pattern[];
    isDefault?: boolean;
}

export const DEFAULT_PATTERN_SETS: PatternSet[] = [
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

export function formatPattern(pattern: Pattern): string {
    return pattern.join(" ");
}

// Generate a random pattern of specified length
export function generateRandomPattern(length: number): Pattern {
    const pattern: Pattern = [];
    for (let i = 0; i < length; i++) {
        // Generate numbers 1-4 for boxing combinations
        pattern.push(Math.floor(Math.random() * 4) + 1);
    }
    return pattern;
}

// Generate a random pattern set
export function generateRandomPatternSet(existingSets: PatternSet[]): PatternSet {
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

    return {
        id: `random-${Date.now()}`,
        name: `Random Set ${existingSets.filter(s => s.name.startsWith('Random Set')).length + 1}`,
        patterns,
    };
}

// Generate a set with specific constraints
export function generateCustomRandomSet(
    existingSets: PatternSet[],
    options: { minPatterns?: number; maxPatterns?: number; allowSingles?: boolean; maxLength?: number }
): PatternSet {
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

    return {
        id: `custom-random-${Date.now()}`,
        name: `Custom Random ${existingSets.filter(s => s.name.startsWith('Custom Random')).length + 1}`,
        patterns,
    };
}

// Encode a pattern set to base64 for sharing
export function encodePatternSet(set: PatternSet): string {
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
}

// Decode a base64 string to a pattern set
export function decodePatternSet(base64: string): PatternSet | null {
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
}

// Import a shared pattern set with unique naming
export function importPatternSet(
    set: PatternSet,
    existingSets: PatternSet[]
): PatternSet {
    // Check if a set with this name already exists
    const existingIndex = existingSets.findIndex(s => s.name === set.name);
    let newSet = { ...set };

    if (existingIndex >= 0) {
        // Append number to make name unique
        const baseName = set.name;
        let counter = 1;
        while (existingSets.some(s => s.name === `${baseName} (${counter})`)) {
            counter++;
        }
        newSet.name = `${baseName} (${counter})`;
    }

    return newSet;
}
