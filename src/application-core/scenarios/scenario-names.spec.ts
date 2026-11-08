import { describe, expect, it } from 'vitest';

import { DRIVER_IGNORES } from '../simulation-engine/indirect-effects.testing';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { ONE_ORDER_SCENARIO } from './one-order.testing';
import { scenarioNames } from './scenario-names';
import type { IIndirectStep } from './scripted-step';

describe("a scenario's names", () => {
    it('are its drivers, its restaurants, and the orders its steps create', () => {
        const ignored: IIndirectStep = { at: toSimTime(45_000), indirect: DRIVER_IGNORES };
        const steps = ONE_ORDER_SCENARIO.steps.push(ignored);
        const scenario = { ...ONE_ORDER_SCENARIO, steps };

        const names = scenarioNames(scenario);

        expect(names).toEqual({
            drivers: ['driver-1'],
            restaurants: ['restaurant-1'],
            orders: ['A'],
        });
    });
});
