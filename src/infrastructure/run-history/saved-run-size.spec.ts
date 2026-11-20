import { describe, expect, it } from 'vitest';

import { toPersistedRun } from '../simulation-engine/persisted-run';
import { forkedRun } from '../simulation-engine/sample-runs.testing';
import { savedBytes, utf8Length } from './saved-run-size';

describe("a saved run's size", () => {
    it.each<[string, string]>([
        ['plain letters', 'order-1'],
        ['letters with accents', 'Café Zürich'],
        ['a character beyond two bytes', '€ and 中'],
        ['a character outside the basic plane', 'a 🚲 delivery'],
    ])('counts the bytes UTF-8 takes for %s', (_name, text) => {
        const encoded = new TextEncoder().encode(text);

        const counted = utf8Length(text);

        expect(counted).toBe(encoded.length);
    });

    it('counts a run commit by commit, close to the run written out as one text', () => {
        const run = forkedRun();
        const persisted = toPersistedRun(run);
        const whole = JSON.stringify(persisted);
        const commits = persisted.branches.flatMap((branch) => branch.commits);

        const bytes = savedBytes(persisted);

        expect(bytes).toBeGreaterThanOrEqual(whole.length);
        expect(bytes).toBeLessThanOrEqual(whole.length + commits.length);
    });
});
