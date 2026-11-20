import { TESTING_FUNCTIONS } from '../application-core/simulation-engine/function-lookup.testing';
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

/** The demonstration's hour, with its drivers' apps sending, takes seconds under coverage. */
const WHOLE_RUN_TIMEOUT_MS = 60_000;

/** The demonstration's digest: it changes when the simulation's behaviour does, on purpose. */
const DEMONSTRATION_DIGEST = '406a2c7eda383061';

/** Why each command the demonstration's actors give is refused, as its log says (FND-49). */
const DEMONSTRATED_REFUSALS = [
    'Offline',
    '{"orders":"NotReady"}',
    'StaleLocation',
    'Busy',
    'TooFar',
    'OtherArea',
    'NoOpenRequest',
    'TooFar',
];
const IDS = LIBRARY.list()
    .map(({ id }) => [id] as const)
    .toArray();

function ran(id: BuiltInScenarioId): IScenarioRun {
    const read = LIBRARY.scenario(id);
    const result = runScenarioResult(read, TESTING_FUNCTIONS);
    if (!result.isOk) {
        throw new Error(`${id} did not run: ${result.problems.size} problems.`);
    }
    return result.run;
}

describe('the built-in library, read from its files and run', () => {
    it.each(IDS)('%s runs to its end', { timeout: WHOLE_RUN_TIMEOUT_MS }, (id) => {
        expect(ran(id).failure).toBeNull();
    });

    it.each(IDS)(
        '%s repeats exactly from the same seed',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        (id) => {
            const runDifference = checkDeterminism(() => ran(id).entries);
            expect(runDifference).toBeNull();
        },
    );

    it.each(IDS)('%s passes every criterion', { timeout: WHOLE_RUN_TIMEOUT_MS }, (id) => {
        const result = checkBuiltInScenario(LIBRARY, id, TESTING_FUNCTIONS);
        expect(result.isOk && result.checked.isPassed).toBe(true);
    });

    it('gives the pinned digest for one-order', () => {
        const id = toBuiltInScenarioId('one-order');
        expect(ran(id).digest).toBe(ONE_ORDER_DIGEST);
    });

    it('lists the demonstration first, before the one-order case the tests pin', () => {
        const ids = LIBRARY.list()
            .map(({ id }) => id)
            .toArray();

        expect(ids).toEqual(['demonstration', 'one-order']);
    });

    it('gives the pinned digest for the demonstration', () => {
        const id = toBuiltInScenarioId('demonstration');
        expect(ran(id).digest).toBe(DEMONSTRATION_DIGEST);
    });

    it('demonstrates every refusal it sets out to, a rule change, and ten orders delivered', () => {
        const id = toBuiltInScenarioId('demonstration');
        const { entries } = ran(id);

        const refusals = entries
            .filter((entry) => entry.kind === 'CommandRefused')
            .map((entry) => {
                const data = entry.data as { refusal: unknown };
                return typeof data.refusal === 'string'
                    ? data.refusal
                    : JSON.stringify(data.refusal);
            })
            .toArray();
        const changes = entries.count((entry) => entry.kind === 'ConfigChanged');
        const delivered = entries.count(
            (entry) => entry.source === 'orders' && entry.kind === 'OrderDelivered',
        );
        expect(refusals).toEqual(DEMONSTRATED_REFUSALS);
        expect(changes).toBe(1);
        expect(delivered).toBe(10);
    });
});
