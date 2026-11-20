import { Map as ImmutableMap } from 'immutable';
import { describe, expect, it } from 'vitest';

import { OrdersState } from '../../domain/orders/orders-state';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import type { FunctionVersions } from './function-lookup';
import { functionInUse, newestVersions } from './function-lookup';
import {
    TableFunctionLookup,
    TESTING_FUNCTIONS,
    TODAYS_FUNCTIONS,
} from './function-lookup.testing';
import { FUNCTION_NAMES, FunctionName, isFunctionName } from './function-name';
import { createRun } from './run-state';

/** A table where mark ready has a second version, which notes each call it gets. */
function withSecondMarkReady(): { calls: string[]; lookup: TableFunctionLookup } {
    const calls: string[] = [];
    const second: typeof OrdersState.markReady = (state, at, orderId, madeBy) => {
        calls.push(orderId);
        return OrdersState.markReady(state, at, orderId, madeBy);
    };
    const markReady = [OrdersState.markReady, second];
    const table = { ...TODAYS_FUNCTIONS, [FunctionName.OrdersMarkReady]: markReady };
    const lookup = new TableFunctionLookup(table);
    return { calls, lookup };
}

describe('a lookup of state functions', () => {
    it('gives the function for a name and a version, and lists its versions, newest last', () => {
        const { lookup } = withSecondMarkReady();
        const first = toVersionNumber(1);

        const found = lookup.functionOf(FunctionName.OrdersMarkReady, first);
        const versions = lookup.versionsOf(FunctionName.OrdersMarkReady);

        expect(found).toBe(OrdersState.markReady);
        expect(versions).toEqual([1, 2]);
    });

    it('refuses a version not registered', () => {
        const ninth = toVersionNumber(9);

        expect(() => TESTING_FUNCTIONS.functionOf(FunctionName.OrdersPickUp, ninth)).toThrow(
            'version 9 of orders.pick-up',
        );
    });

    it('knows every function by name, and nothing else', () => {
        const isEach = FUNCTION_NAMES.every(isFunctionName);

        const isUnknown = isFunctionName('orders.no-such-function');
        expect(isEach).toBe(true);
        expect(isUnknown).toBe(false);
    });
});

describe("the versions a run's functions are at", () => {
    it('start at the newest of every function', () => {
        const { lookup } = withSecondMarkReady();

        const versions = newestVersions(lookup);

        const markReady = versions.get(FunctionName.OrdersMarkReady);
        const pickUp = versions.get(FunctionName.OrdersPickUp);
        expect(markReady).toBe(2);
        expect(pickUp).toBe(1);
        expect(versions.size).toBe(FUNCTION_NAMES.length);
    });

    it('are held in the start root, with the lookup beside the run', () => {
        const { lookup } = withSecondMarkReady();

        const run = createRun({ seed: toSeed(1), functions: lookup });

        const held = run.root.effects.direct.functionVersions;
        const newest = newestVersions(lookup);
        expect(held).toEqual(newest);
        expect(run.functions).toBe(lookup);
    });

    it('pick the function every call goes through', () => {
        const { calls, lookup } = withSecondMarkReady();
        const run = createRun({ seed: toSeed(1), functions: lookup });
        const first = toVersionNumber(1);
        const older = run.root.effects.direct.functionVersions.set(
            FunctionName.OrdersMarkReady,
            first,
        );
        const direct = { ...run.root.effects.direct, functionVersions: older };
        const atFirst = {
            ...run,
            root: { ...run.root, effects: { ...run.root.effects, direct } },
        };

        const newest = functionInUse(run, FunctionName.OrdersMarkReady);
        const atVersionOne = functionInUse(atFirst, FunctionName.OrdersMarkReady);

        expect(newest).not.toBe(OrdersState.markReady);
        expect(atVersionOne).toBe(OrdersState.markReady);
        expect(calls).toEqual([]);
    });

    it('refuse a function the run holds no version of', () => {
        const run = createRun({ seed: toSeed(1), functions: TESTING_FUNCTIONS });
        const none: FunctionVersions = ImmutableMap();
        const direct = { ...run.root.effects.direct, functionVersions: none };
        const without = {
            ...run,
            root: { ...run.root, effects: { ...run.root.effects, direct } },
        };

        expect(() => functionInUse(without, FunctionName.OrdersPickUp)).toThrow(
            'the version of orders.pick-up in use',
        );
    });
});
