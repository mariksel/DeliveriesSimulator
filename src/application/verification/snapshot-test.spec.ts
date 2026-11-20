import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { MemoryRunRepository } from '../../application-core/run-history/run-stores.testing';
import { RunLevel, toSavedRunId } from '../../application-core/run-history/saved-run';
import type { SaveOutcome, SavedRunId } from '../../application-core/run-history/saved-run';
import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { toCommitId } from '../../application-core/simulation-engine/commit-id';
import type { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import {
    TableFunctionLookup,
    TESTING_FUNCTIONS,
    TODAYS_FUNCTIONS,
} from '../../application-core/simulation-engine/function-lookup.testing';
import { FunctionName } from '../../application-core/simulation-engine/function-name';
import { switchVersions } from '../../application-core/simulation-engine/implementation-change';
import { forkAt } from '../../application-core/simulation-engine/run-branches';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { SnapshotVersions, snapshotTest } from '../../application-core/verification/snapshot-test';
import { toCalendarTime, toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { Maker } from '../../domain/system/records/maker';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { OrdersState } from '../../domain/orders/orders-state';
import { HAPPY_PATH, START } from '../simulation-engine/one-order-run.testing';
import { SimulationRun } from '../simulation-engine/simulation-run';
import { snapshotTestsOfSaved } from './snapshot-tests';

const END = toSimTime(300_000);

/**
 * Mark ready changed on purpose: its version 2 names the run's start as each version's maker, so
 * every commit that marks an order ready comes out differently.
 */
const START_MAKER = Maker.runStart();
const changedMarkReady: typeof OrdersState.markReady = (state, at, orderId) =>
    OrdersState.markReady(state, at, orderId, START_MAKER);

/** A lookup with mark ready at version 1, today's, and a version 2 changed on purpose. */
const WITH_VERSION_2: FunctionLookup = new TableFunctionLookup({
    ...TODAYS_FUNCTIONS,
    [FunctionName.OrdersMarkReady]: [OrdersState.markReady, changedMarkReady],
});

/** The one-order run, to its end, on a lookup, with a change to it before it runs. */
function oneOrderRun(
    functions: FunctionLookup = TESTING_FUNCTIONS,
    before: (run: IRunState) => IRunState = (run): IRunState => run,
): IRunState {
    const created = createRun({ seed: toSeed(1), functions });
    const steps = List(HAPPY_PATH);
    const scheduled = scheduleInputs(created, START, steps);
    const changed = before(scheduled);
    const run = new SimulationRun(changed);
    run.advanceTo(END);
    return run.state;
}

/** The place of the first commit that marks an order ready, on the run's line. */
function firstMarkReady(run: IRunState): number {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.findIndex((commit) => commit.call?.fn === OrdersState.markReady) + 1;
}

function idOf(outcome: SaveOutcome): SavedRunId {
    if (!outcome.isOk) {
        throw new Error(outcome.message);
    }
    return outcome.saved.id;
}

describe('a snapshot test', () => {
    it("reruns every state commit with the run's own versions, and every one matches", () => {
        const run = oneOrderRun();

        const result = snapshotTest(run, SnapshotVersions.Own);

        const stateCommits = run.line.commits.count((commit) => commit.call !== null);
        expect(result).toEqual({
            versions: SnapshotVersions.Own,
            compared: stateCommits,
            difference: null,
        });
    });

    it('shows the first commit a behaviour change affects, rerun with the newest versions', () => {
        const run = oneOrderRun();
        const place = firstMarkReady(run);

        const own = snapshotTest(run, SnapshotVersions.Own, WITH_VERSION_2);
        const newest = snapshotTest(run, SnapshotVersions.Newest, WITH_VERSION_2);

        const commit = run.line.commits.valueSeq().get(place - 1)?.id;
        expect(own.difference).toBeNull();
        expect(newest.difference).toEqual({ branch: MAIN_BRANCH, place, commit });
    });

    it('keeps a version the run switched to, from the switch on, rerun with the newest', () => {
        const version = toVersionNumber(1);
        const uses = List([{ function: FunctionName.OrdersMarkReady, version }]);
        const atStart = toSimTime(0);
        const switched = (run: IRunState): IRunState => switchVersions(run, atStart, uses);
        const run = oneOrderRun(WITH_VERSION_2, switched);

        const result = snapshotTest(run, SnapshotVersions.Newest, WITH_VERSION_2);

        expect(result.difference).toBeNull();
        expect(result.compared).toBeGreaterThan(0);
    });

    it('reruns every branch, each from where it forked', () => {
        const run = oneOrderRun();
        const middle = Math.floor(run.line.commits.size / 2);
        const half = toPosition(middle);
        const forked = forkAt(run, half);
        const live = new SimulationRun(forked);
        live.advanceTo(END);

        const result = snapshotTest(live.state, SnapshotVersions.Own);

        const own = snapshotTest(run, SnapshotVersions.Own);
        expect(result.difference).toBeNull();
        expect(result.compared).toBeGreaterThan(own.compared);
    });
});

describe('both snapshot tests of a saved run', () => {
    it('read the run once through Run history, and have nothing for one not saved', async () => {
        const runs = new MemoryRunRepository();
        const run = oneOrderRun();
        const scenario = { name: 'One order', number: toVersionNumber(1) };
        const savedAt = toCalendarTime(0);
        const request = { name: 'kept', level: RunLevel.Minimum, scenario, savedAt, run };
        const outcome = await runs.save(request);
        const id = idOf(outcome);
        const notSaved = toSavedRunId('saved-run-9');

        const results = await snapshotTestsOfSaved(runs, id, WITH_VERSION_2);
        const none = await snapshotTestsOfSaved(runs, notSaved);

        const place = firstMarkReady(run);
        expect(results?.own.difference).toBeNull();
        expect(results?.newest.difference?.place).toBe(place);
        expect(none).toBeUndefined();
    });

    it('report a root that came out differently as the run opened, for both', async () => {
        const runs = new MemoryRunRepository();
        const error = new Error('Commit commit-4 worked out differently.');
        const mismatch = Object.assign(error, {
            kind: 'RebuildMismatch',
            branch: MAIN_BRANCH,
            place: toPosition(4),
            commit: toCommitId('commit-4'),
        });
        runs.load = (): Promise<undefined> => Promise.reject(mismatch);
        const first = toSavedRunId('saved-run-1');

        const results = await snapshotTestsOfSaved(runs, first);

        const difference = { branch: MAIN_BRANCH, place: 4, commit: 'commit-4' };
        expect(results).toEqual({
            own: { versions: SnapshotVersions.Own, compared: 4, difference },
            newest: { versions: SnapshotVersions.Newest, compared: 4, difference },
        });
    });

    it('pass on any other failure', async () => {
        const runs = new MemoryRunRepository();
        const broken = new Error('Storage broke.');
        runs.load = (): Promise<undefined> => Promise.reject(broken);
        const first = toSavedRunId('saved-run-1');

        const testing = snapshotTestsOfSaved(runs, first);

        await expect(testing).rejects.toThrow('Storage broke.');
    });
});
