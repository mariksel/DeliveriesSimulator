import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import { BundledScenarios } from './bundled-scenarios';
import { toBuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';

const ONE_ORDER_BUILT_IN = toBuiltInScenarioId('one-order');
const NO_SUCH_BUILT_IN = toBuiltInScenarioId('nope');

describe('the bundled built-in scenarios', () => {
    const library = new BundledScenarios();

    it('lists the happy path of one order', () => {
        const list = library.list().toArray();

        expect(list).toEqual([{ id: 'one-order', name: 'One order, happy path' }]);
    });

    it('reads every file in the library without a problem', () => {
        const results = library.list().map(({ id }) => library.scenario(id));

        const isEveryOk = results.every((result) => result.isOk);
        expect(isEveryOk).toBe(true);
    });

    it("reads one-order's file as the typed scenario the tests use", () => {
        const result = library.scenario(ONE_ORDER_BUILT_IN);

        expect(result).toEqual({ isOk: true, scenario: ONE_ORDER_SCENARIO, warnings: List() });
    });

    it('has no scenario under an unknown ID', () => {
        const result = library.scenario(NO_SUCH_BUILT_IN);

        const problems = result.isOk ? [] : result.problems.toArray();
        expect(problems).toEqual([{ path: '', message: 'there is no built-in scenario "nope"' }]);
    });
});
