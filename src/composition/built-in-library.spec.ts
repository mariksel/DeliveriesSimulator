import { describe, expect, it } from 'vitest';

import { ONE_ORDER_DIGEST } from '../../e2e/fixtures/one-order-digest';
import { checkDeterminism } from '../application/simulation-engine/determinism-check';
import { runScenarioResult } from '../application/scenarios/scenario-runner';
import type { IScenarioRun } from '../application/scenarios/scenario-runner';
import { checkBuiltInScenario } from '../application/verification/check-scenario';
import type { BuiltInScenarioId } from '../application-core/scenarios/built-in-scenarios';
import { toBuiltInScenarioId } from '../application-core/scenarios/built-in-scenarios';
import { BundledScenarios } from '../infrastructure/scenarios/bundled-scenarios';

const LIBRARY = new BundledScenarios();
const IDS = LIBRARY.list()
    .map(({ id }) => [id] as const)
    .toArray();

function ran(id: BuiltInScenarioId): IScenarioRun {
    const read = LIBRARY.scenario(id);
    const result = runScenarioResult(read);
    if (!result.isOk) {
        throw new Error(`${id} did not run: ${result.problems.size} problems.`);
    }
    return result.run;
}

describe('the built-in library, read from its files and run', () => {
    it.each(IDS)('%s runs to its end', (id) => {
        expect(ran(id).failure).toBeNull();
    });

    it.each(IDS)('%s repeats exactly from the same seed', (id) => {
        const runDifference = checkDeterminism(() => ran(id).entries);
        expect(runDifference).toBeNull();
    });

    it.each(IDS)('%s passes every criterion', (id) => {
        const result = checkBuiltInScenario(LIBRARY, id);
        expect(result.isOk && result.checked.isPassed).toBe(true);
    });

    it('gives the pinned digest for one-order', () => {
        const id = toBuiltInScenarioId('one-order');
        expect(ran(id).digest).toBe(ONE_ORDER_DIGEST);
    });
});
