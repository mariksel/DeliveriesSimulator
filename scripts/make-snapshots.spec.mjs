import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const TIMEOUT_MS = 60_000;

describe('making the kept snapshot runs', () => {
    const temporary = tmpdir();
    const prefix = join(temporary, 'snapshots-');
    const out = mkdtempSync(prefix);
    execFileSync(process.execPath, ['scripts/make-snapshots.mjs', '--out', out], {
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
    });

    afterAll(() => {
        rmSync(out, { recursive: true, force: true });
    });

    it('saves a run of each built-in scenario at minimum, with its schema version', () => {
        const path = join(out, 'one-order.json');
        const text = readFileSync(path, 'utf8');
        const body = JSON.parse(text);

        const [main] = body.run.branches;
        expect(body.schemaVersion).toBeGreaterThan(0);
        expect(main.commits.length).toBeGreaterThan(0);
        expect(main.commits[0]).toHaveProperty('digest');
        expect(main.commits[0]).not.toHaveProperty('change');
    });

    it('gives the same file as the one the repository keeps, as nothing has changed since', () => {
        const path = join(out, 'one-order.json');
        const made = readFileSync(path, 'utf8');
        const kept = readFileSync(
            'src/infrastructure/verification/snapshots/one-order.json',
            'utf8',
        );

        expect(made).toBe(kept);
    });
});
