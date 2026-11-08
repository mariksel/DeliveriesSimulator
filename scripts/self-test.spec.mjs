import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const TIMEOUT_MS = 60_000;

describe('the self-test command', () => {
    const secondExecFileSync = execFileSync(process.execPath, ['scripts/self-test.mjs'], {
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
    });
    const report = JSON.parse(secondExecFileSync);

    it('reports that the self-tests passed', () => {
        expect(report.isPassed).toBe(true);
    });

    it('lists each break it made', () => {
        expect(report.results.length).toBeGreaterThanOrEqual(4);
    });
});
