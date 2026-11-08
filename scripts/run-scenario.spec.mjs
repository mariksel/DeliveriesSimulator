import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { ONE_ORDER_DIGEST } from '../e2e/fixtures/one-order-digest';

const TEMPORARY_FOLDER = tmpdir();
const FOLDER_PREFIX = join(TEMPORARY_FOLDER, 'scenario-');
const folder = mkdtempSync(FOLDER_PREFIX);
afterAll(() => rmSync(folder, { recursive: true, force: true }));

function run(...args) {
    return spawnSync(process.execPath, ['scripts/run-scenario.mjs', ...args], {
        encoding: 'utf8',
        timeout: 60_000,
    });
}

describe('running a scenario headless', () => {
    it('gives the pinned digest, the same as in Node and in each browser', () => {
        const result = run('src/infrastructure/scenarios/built-in/one-order.json');

        expect(result.status).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toMatchObject({
            isOk: true,
            name: 'One order, happy path',
            seed: 42,
            digest: ONE_ORDER_DIGEST,
        });
    });

    it('passes the built-in scenario, on all four criteria', () => {
        const result = run('--built-in', 'one-order');

        const report = JSON.parse(result.stdout);
        expect(result.status).toBe(0);
        expect(report.isPassed).toBe(true);
        expect(report.digest).toBe(ONE_ORDER_DIGEST);
        const criteria = report.criteria.map((criterion) => [
            criterion.criterion,
            criterion.violations,
        ]);
        expect(criteria).toEqual([
            ['Valid final state', []],
            ['Modules agree', []],
            ['Exactly-once effect', []],
            ['Outbox for every event', []],
        ]);
    });

    it('fails a scenario that breaks a criterion, and says why', () => {
        const fileSync = readFileSync(
            'src/infrastructure/scenarios/built-in/one-order.json',
            'utf8',
        );
        const value = JSON.parse(fileSync);
        const file = join(folder, 'unfinished.json');
        const stateJson = JSON.stringify({ ...value, steps: value.steps.slice(0, 5) });
        writeFileSync(file, stateJson);

        const result = run(file);

        const report = JSON.parse(result.stdout);
        expect(result.status).toBe(1);
        expect(report.isPassed).toBe(false);
        expect(report.criteria[0].violations[0].message).toContain('not a final state');
    });

    it('reports an unknown built-in scenario, and fails', () => {
        const result = run('--built-in', 'nope');

        expect(result.status).toBe(1);
        expect(JSON.parse(result.stdout).problems[0].message).toContain('no built-in scenario');
    });

    it('says how to use it, when a built-in scenario is not named', () => {
        const result = run('--built-in');

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('Usage');
    });

    it('reports what is wrong with an invalid file, and fails', () => {
        const file = join(folder, 'invalid.json');
        writeFileSync(file, '{}');

        const result = run(file);

        expect(result.status).toBe(1);
        expect(JSON.parse(result.stdout).problems).toContainEqual({
            path: 'name',
            message: 'is missing',
        });
    });

    it('says so when the file cannot be read', () => {
        const secondJoin = join(folder, 'missing.json');
        const ran = run(secondJoin);

        expect(ran.status).toBe(2);
        expect(ran.stderr).toContain('Cannot read');
    });

    it('says how to use it, with no file', () => {
        const result = run();

        expect(result.status).toBe(2);
        expect(result.stderr).toContain('Usage');
    });
}, 120_000);
