import { describe, expect, it } from 'vitest';

import { oneOrderRun } from '../simulation-engine/sample-runs.testing';
import { MemoryRunRepository } from './memory-run-repository';

const SECOND = 1000;
/**
 * Comparing two whole runs field by field takes about a second, but more than 5 under a loaded
 * coverage run, so these tests get longer.
 */
const WHOLE_RUN_TIMEOUT_MS = 30_000;

describe('the in-memory run repository', () => {
    it('gives back the run kept under a name', { timeout: WHOLE_RUN_TIMEOUT_MS }, () => {
        const repository = new MemoryRunRepository();
        const state = oneOrderRun();

        repository.save('first', state);

        const loaded = repository.load('first');
        expect(loaded).toEqual(state);
    });

    it('has nothing under a name it never kept', () => {
        const repository = new MemoryRunRepository();

        const loaded = repository.load('missing');

        expect(loaded).toBeUndefined();
    });

    it('replaces the run kept under a name', { timeout: WHOLE_RUN_TIMEOUT_MS }, () => {
        const repository = new MemoryRunRepository();
        const early = oneOrderRun(10 * SECOND);
        const state = oneOrderRun();

        repository.save('run', early);
        repository.save('run', state);

        const loaded = repository.load('run');
        expect(loaded).toEqual(state);
    });

    it('keeps persisted records, never the run itself', () => {
        const repository = new MemoryRunRepository();
        const state = oneOrderRun();

        repository.save('run', state);

        const persisted = repository.persisted('run');
        const text = JSON.stringify(persisted);
        const parsed: unknown = JSON.parse(text);
        expect(parsed).toEqual(persisted);
        expect(persisted).not.toBe(state);
    });

    it('gives a new run each time it loads', { timeout: WHOLE_RUN_TIMEOUT_MS }, () => {
        const repository = new MemoryRunRepository();
        const state = oneOrderRun();
        repository.save('run', state);

        const once = repository.load('run');
        const again = repository.load('run');

        expect(once).not.toBe(again);
        expect(once).toEqual(again);
    });
});
