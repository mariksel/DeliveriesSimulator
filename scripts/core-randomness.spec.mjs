import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Random numbers and dates are part of JavaScript itself, so compiling the core without browser
// types cannot catch them. All of a run's randomness and time must come from its seed and clock.
const OUTSIDE_THE_RUN = /\bMath\s*\.\s*random\b|\bDate\b|\bcrypto\b/;

function sources(folder) {
    return readdirSync(folder, { withFileTypes: true, recursive: true })
        .filter(
            (entry) =>
                entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts'),
        )
        .map((entry) => join(entry.parentPath, entry.name));
}

describe('the core takes randomness and time only from the run', () => {
    const files = [
        ...sources('src/domain'),
        ...sources('src/application-core'),
        ...sources('src/application'),
    ];

    it('finds the core', () => {
        expect(files.length).toBeGreaterThan(0);
    });

    it.each(files)('%s', (file) => {
        const fileSync = readFileSync(file, 'utf8');
        expect(fileSync).not.toMatch(OUTSIDE_THE_RUN);
    });

    it.each([
        'Math.random()',
        'Math . random',
        'Date.now()',
        'new Date()',
        'crypto.getRandomValues(x)',
    ])('would catch %s', (text) => {
        expect(text).toMatch(OUTSIDE_THE_RUN);
    });
});
