import { describe, expect, it } from 'vitest';

import type { IScenario } from '../../application-core/scenarios/scenario';
import { readScenario } from './read-scenario';

const CREATE = {
    at: 'h00:m00:s01:ms00',
    actor: 'restaurant-1',
    command: 'create-order',
    order: 'A',
};
const IGNORED = {
    at: 'h00:m00:s45:ms00',
    indirect: 'driver-ignores-request',
    actor: 'driver-1',
    order: 'A',
    label: 'ignored',
};
const FOLLOWING = {
    at: 'h00:m01:s00:ms00',
    actor: 'driver-1',
    command: 'accept',
    order: 'A',
    after: 'ignored',
};

/** A scenario with these steps after the order is created. */
function withSteps(...steps: readonly Record<string, unknown>[]): unknown {
    return {
        format: 1,
        name: 'Indirect effects',
        version: 'V1.0.0',
        seed: 42,
        runUntil: 'h00:m05:s00:ms00',
        restaurants: [
            {
                id: 'restaurant-1',
                area: 'area-1',
                location: { latitude: 10.33, longitude: 20.82 },
            },
        ],
        drivers: [{ id: 'driver-1', area: 'area-1', availability: 'Available' }],
        steps: [CREATE, ...steps],
    };
}

function read(value: unknown): IScenario {
    const result = readScenario(value);
    if (!result.isOk) {
        const problemsJson = JSON.stringify(result.problems);
        throw new Error(problemsJson);
    }
    return result.scenario;
}

function problemsOf(value: unknown): string[] {
    const result = readScenario(value);
    return result.isOk
        ? []
        : result.problems.map((problem) => `${problem.path}: ${problem.message}`).toArray();
}

describe('an indirect step', () => {
    it('reads each kind with its data, and an action that follows from its label', () => {
        const late = {
            at: 'h00:m00:s20:ms00',
            indirect: 'restaurant-runs-late',
            actor: 'restaurant-1',
            order: 'A',
            lateBy: 'h00:m01:s30:ms00',
        };
        const wont = { at: 'h00:m02:s00:ms00', indirect: 'customer-wont-take-order', order: 'A' };
        const value = withSteps(late, IGNORED, FOLLOWING, wont);
        const scenario = read(value);

        const steps = scenario.steps.toArray();
        expect(steps[1]).toMatchObject({
            at: 20_000,
            indirect: { kind: 'restaurant-runs-late', actor: 'restaurant-1', label: null },
        });
        expect(steps[1]).toHaveProperty('indirect.lateBy.milliseconds', 90_000);
        expect(steps[2]).toMatchObject({
            indirect: { kind: 'driver-ignores-request', actor: 'driver-1', order: 'A' },
        });
        expect(steps[3]).toMatchObject({ command: 'accept', after: 'ignored' });
        expect(steps[4]).toMatchObject({
            at: 120_000,
            indirect: { kind: 'customer-wont-take-order', order: 'A', label: null },
        });
        expect(steps[4]).not.toHaveProperty('indirect.actor');
    });

    it('names the kinds when the kind is unknown', () => {
        const unknown = { ...IGNORED, indirect: 'driver-sleeps' };

        const value = withSteps(unknown);
        const problems = problemsOf(value);

        expect(problems).toEqual([
            'steps[1].indirect: must be one of driver-ignores-request, restaurant-runs-late, customer-wont-take-order',
        ]);
    });

    it('checks the actor is the kind of actor the kind needs, and the order is created', () => {
        const wrongActor = { ...IGNORED, actor: 'restaurant-1', order: 'B' };

        const value = withSteps(wrongActor);
        const problems = problemsOf(value);

        expect(problems).toEqual([
            'steps[1].actor: must be a driver for driver-ignores-request',
            'steps[1].order: "B" is not created by an earlier step',
        ]);
    });

    it('refuses a field its kind does not take, and a late restaurant with no delay', () => {
        const extra = { ...IGNORED, lateBy: 'h00:m01:s00:ms00' };
        const noDelay = {
            at: 'h00:m00:s50:ms00',
            indirect: 'restaurant-runs-late',
            actor: 'restaurant-1',
            order: 'A',
            lateBy: 'h00:m00:s00:ms00',
        };

        const value = withSteps(extra, noDelay);
        const problems = problemsOf(value);

        expect(problems).toEqual([
            'steps[1].lateBy: is not a field of this format',
            'steps[2].lateBy: must be longer than no time',
        ]);
    });

    it('refuses a repeated label, and an action after a label no earlier step gave', () => {
        const repeated = { ...IGNORED, at: 'h00:m00:s50:ms00' };
        const tooEarly = { ...FOLLOWING, at: 'h00:m00:s30:ms00', after: 'later' };

        const value = withSteps(tooEarly, IGNORED, repeated);
        const problems = problemsOf(value);

        expect(problems).toEqual([
            'steps[1].after: "later" is not the label of an earlier indirect step',
            'steps[3].label: repeats "ignored"',
        ]);
    });
});
