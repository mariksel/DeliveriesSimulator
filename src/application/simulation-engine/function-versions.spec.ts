import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import {
    TableFunctionLookup,
    TODAYS_FUNCTIONS,
} from '../../application-core/simulation-engine/function-lookup.testing';
import { FunctionName } from '../../application-core/simulation-engine/function-name';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { OrdersState } from '../../domain/orders/orders-state';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { HAPPY_PATH, START } from './one-order-run.testing';
import { SimulationRun } from './simulation-run';

import { CommitKind } from '../../application-core/simulation-engine/commit';
import type {
    IFunctionUse,
    IUseInput,
    ScriptInput,
} from '../../application-core/simulation-engine/run-input';
import { switchVersions } from '../../application-core/simulation-engine/implementation-change';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { toVersionNumber } from '../../domain/system/records/version-chain';

/** A lookup where mark ready has a second version, which notes each order it is called for. */
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

describe('a run with two versions of a function', () => {
    it('sends its state calls through the version it holds, the newest at the start', () => {
        const { calls, lookup } = withSecondMarkReady();
        const created = createRun({ seed: toSeed(1), functions: lookup });
        const steps = List(HAPPY_PATH);
        const start = scheduleInputs(created, START, steps);
        const run = new SimulationRun(start);
        const end = toSimTime(300_000);

        run.advanceTo(end);

        const orderIds = [...run.state.root.state.orders.orderVersions.keys()];
        expect(calls).toEqual(orderIds);
        expect(orderIds).toHaveLength(1);
    });
});

const AT_START = toSimTime(0);

const useMarkReady = (version: number): List<IFunctionUse> =>
    List([{ function: FunctionName.OrdersMarkReady, version: toVersionNumber(version) }]);
const END = toSimTime(300_000);

describe('switching a function to another version during a run', () => {
    /** The one-order run on a lookup with two versions of mark ready, not yet run. */
    function started(): { calls: string[]; run: IRunState } {
        const { calls, lookup } = withSecondMarkReady();
        const created = createRun({ seed: toSeed(1), functions: lookup });
        const steps = List(HAPPY_PATH);
        const run = scheduleInputs(created, START, steps);
        return { calls, run };
    }

    it('makes an implementation change commit, and later calls go through the version it puts in use', () => {
        const { calls, run } = started();
        const uses = useMarkReady(1);

        const switched = switchVersions(run, AT_START, uses);
        const live = new SimulationRun(switched);
        live.advanceTo(END);

        const commit = switched.line.commits.last();
        const inUse = live.state.root.effects.direct.functionVersions.get(
            FunctionName.OrdersMarkReady,
        );
        const entry = live.state.cache.log.entries.find(
            (each) => each.kind === TechnicalLogKind.FunctionVersionSwitched,
        );
        expect(commit?.kind).toBe(CommitKind.ImplementationChange);
        expect(entry?.data).toEqual({
            function: FunctionName.OrdersMarkReady,
            before: 2,
            after: 1,
        });
        expect(inUse).toBe(1);
        expect(calls).toEqual([]);
        expect(switched.cache.stepsRun).toBe(run.cache.stepsRun);
    });

    it('writes no entry for a function already at the version asked for', () => {
        const { run } = started();
        const uses = useMarkReady(2);

        const switched = switchVersions(run, AT_START, uses);

        const entries = switched.cache.log.entries.size;
        expect(switched.line.commits.last()?.kind).toBe(CommitKind.ImplementationChange);
        expect(entries).toBe(run.cache.log.entries.size);
    });

    it('refuses a version the run does not hold, and a time before its latest commit', () => {
        const { run } = started();
        const live = new SimulationRun(run);
        live.advanceTo(END);
        const ended = live.state;
        const missing = useMarkReady(3);
        const known = useMarkReady(1);

        expect(() => switchVersions(run, AT_START, missing)).toThrow('has no version 3');
        expect(() => switchVersions(ended, AT_START, known)).toThrow('the latest commit is at');
    });
});

describe("a script's use step", () => {
    it('switches the version as a commit that counts as a step run', () => {
        const { calls, lookup } = withSecondMarkReady();
        const created = createRun({ seed: toSeed(1), functions: lookup });
        const use: IUseInput = { at: AT_START, uses: useMarkReady(1) };
        const steps = List<ScriptInput>([use, ...HAPPY_PATH]);
        const scheduled = scheduleInputs(created, START, steps);
        const run = new SimulationRun(scheduled);

        run.advanceTo(END);

        const commits = run.state.line.commits.valueSeq();
        const switched = commits.find((commit) => commit.kind === CommitKind.ImplementationChange);
        const stepsRun = run.state.cache.stepsRun;
        expect(switched?.effect).toMatchObject({ isScripted: true });
        expect(stepsRun).toBe(steps.size);
        expect(calls).toEqual([]);
    });
});
