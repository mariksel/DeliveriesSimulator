import { describe, expect, it } from 'vitest';

import { toBuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';
import type { IScenario } from '../../application-core/scenarios/scenario';
import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import INDIRECT_FILE from '../../../e2e/fixtures/indirect-effects.json';
import { BundledScenarios } from './bundled-scenarios';
import {
    fromPersistedScenario,
    scenarioContentKey,
    toPersistedScenario,
} from './persisted-scenario';
import { readScenario } from './read-scenario';

/** A scenario read from a file's contents, which must be valid. */
function readFrom(contents: unknown): IScenario {
    const result = readScenario(contents);
    if (!result.isOk) {
        throw new Error('The scenario is not valid.');
    }
    return result.scenario;
}

const BUILT_IN_ID = toBuiltInScenarioId('one-order');
const BUILT_INS = new BundledScenarios();
const BUILT_IN_RESULT = BUILT_INS.scenario(BUILT_IN_ID);
const BUILT_IN = BUILT_IN_RESULT.isOk ? BUILT_IN_RESULT.scenario : ONE_ORDER_SCENARIO;
const WITH_INDIRECT = readFrom(INDIRECT_FILE);

describe('a persisted scenario', () => {
    it.each<[string, IScenario]>([
        ['the one-order scenario', ONE_ORDER_SCENARIO],
        ['the built-in scenario', BUILT_IN],
        ['a scenario with indirect steps and labels', WITH_INDIRECT],
    ])('maps back exactly, for %s', (_name, scenario) => {
        const persisted = toPersistedScenario(scenario);

        const loaded = fromPersistedScenario(persisted);

        expect(loaded).toEqual(scenario);
    });

    it('keeps the city and the seed its places are picked from', () => {
        const persisted = toPersistedScenario(BUILT_IN);

        const loaded = fromPersistedScenario(persisted);

        expect(persisted.start.city).toMatchObject({ seed: 7, across: 2, down: 2 });
        expect(loaded.start.city).toEqual(BUILT_IN.start.city);
    });

    it('gives no city to a scenario stored before scenarios had cities', () => {
        const persisted = toPersistedScenario(BUILT_IN);
        const fields = Object.entries(persisted.start).filter(([key]) => key !== 'city');
        const withoutCity = Object.fromEntries(fields) as typeof persisted.start;
        const older = { ...persisted, start: withoutCity };

        const loaded = fromPersistedScenario(older);

        expect(loaded.start.city).toBeNull();
    });

    it("keeps the customers, their addresses, and a create-order step's destination", () => {
        const persisted = toPersistedScenario(BUILT_IN);

        const loaded = fromPersistedScenario(persisted);

        expect(persisted.start.customers).toEqual([
            { id: 'customer-1', restaurantId: 'restaurant-1' },
        ]);
        expect(persisted.start.addresses?.[0]).toMatchObject({
            id: 'address-1',
            customerId: 'customer-1',
            areaId: 'area-1',
        });
        expect(persisted.steps[0]).toMatchObject({ customer: 'customer-1', address: 'address-1' });
        expect(persisted.steps[1]).not.toHaveProperty('customer');
        expect(loaded.start.addresses).toEqual(BUILT_IN.start.addresses);
    });

    it('refuses a scenario stored before orders had customers, saying why', () => {
        const persisted = toPersistedScenario(BUILT_IN);
        const steps = persisted.steps.map((step) => {
            const fields = Object.entries(step).filter(
                ([key]) => key !== 'customer' && key !== 'address',
            );
            return Object.fromEntries(fields) as typeof step;
        });
        const older = { ...persisted, steps };

        const loading = (): unknown => fromPersistedScenario(older);

        expect(loading).toThrow(
            /"One order, happy path" was stored before orders had customers: its create-order steps name no customer or address/,
        );
    });

    it('reads a scenario stored before customers that creates no order, with none', () => {
        const persisted = toPersistedScenario(BUILT_IN);
        const fields = Object.entries(persisted.start).filter(
            ([key]) => key !== 'customers' && key !== 'addresses',
        );
        const start = Object.fromEntries(fields) as typeof persisted.start;
        const older = { ...persisted, start, steps: [] };

        const loaded = fromPersistedScenario(older);

        expect(loaded.start.customers.size).toBe(0);
        expect(loaded.start.addresses.size).toBe(0);
    });

    it('keeps a start with rules, and a rules step that follows from an indirect step', () => {
        const rule = {
            rule: 'drivers.dispatch-pass',
            parameter: 'interval',
            value: 'h00:m00:s10:ms00',
        };
        const following = { at: 'h00:m04:s30:ms00', set: [rule], after: 'ignored' };
        const steps: unknown[] = [...INDIRECT_FILE.steps, following];
        const scenario = readFrom({ ...INDIRECT_FILE, rules: [rule], steps });

        const persisted = toPersistedScenario(scenario);
        const loaded = fromPersistedScenario(persisted);

        expect(loaded).toEqual(scenario);
        expect(persisted.start.rules).toHaveLength(1);
        const last = persisted.steps.at(-1);
        expect(last).toMatchObject({ after: 'ignored' });
    });
});

describe('a stored use step', () => {
    it('keeps the functions and versions it switches, and the indirect step it follows', () => {
        const use = {
            at: 'h00:m04:s30:ms00',
            use: [{ function: 'orders.pick-up', version: 1 }],
            after: 'ignored',
        };
        const steps: unknown[] = [...INDIRECT_FILE.steps, use];
        const scenario = readFrom({ ...INDIRECT_FILE, steps });

        const persisted = toPersistedScenario(scenario);
        const loaded = fromPersistedScenario(persisted);

        const last = persisted.steps.at(-1);
        expect(loaded).toEqual(scenario);
        expect(last).toEqual({
            at: 270_000,
            use: [{ function: 'orders.pick-up', version: 1 }],
            after: 'ignored',
        });
    });

    it('refuses a stored function no release has', () => {
        const scenario = readFrom(INDIRECT_FILE);
        const persisted = toPersistedScenario(scenario);
        const gone = { at: 1, use: [{ function: 'orders.gone', version: 1 }], after: null };
        const steps = [...persisted.steps, gone];

        expect(() => fromPersistedScenario({ ...persisted, steps })).toThrow('orders.gone');
    });
});

describe("a scenario's content key", () => {
    it("is the same for the same content, whatever the file's spacing or key order", () => {
        const entries = Object.entries(INDIRECT_FILE);
        const reversed = entries.toReversed();
        const reordered = Object.fromEntries(reversed);
        const fromText = readFrom(reordered);

        const first = scenarioContentKey(WITH_INDIRECT);
        const second = scenarioContentKey(fromText);

        expect(second).toBe(first);
    });

    it('differs for an edited description, as every field is content', () => {
        const edited = { ...WITH_INDIRECT, description: 'Edited.' };

        const first = scenarioContentKey(WITH_INDIRECT);
        const second = scenarioContentKey(edited);

        expect(second).not.toBe(first);
    });
});
