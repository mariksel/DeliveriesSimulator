import { describe, expect, it } from 'vitest';

import {
    TableFunctionLookup,
    TODAYS_FUNCTIONS,
} from '../../application-core/simulation-engine/function-lookup.testing';
import { FunctionName } from '../../application-core/simulation-engine/function-name';
import { OrdersState } from '../../domain/orders/orders-state';
import { Maker } from '../../domain/system/records/maker';

import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { SnapshotVersions, snapshotTest } from '../../application-core/verification/snapshot-test';
import { isPersistedSavedRunBody, migrated } from '../run-history/persisted-saved-run';
import { BundledScenarios } from '../scenarios/bundled-scenarios';
import { REGISTERED_FUNCTIONS } from '../simulation-engine/function-registry';
import { fromPersistedRun } from '../simulation-engine/persisted-run';
import DEMONSTRATION from './snapshots/demonstration.json';
import ONE_ORDER from './snapshots/one-order.json';

/*
 * The snapshot tests over the runs the repository keeps: one of each built-in scenario, saved at
 * "minimum" by `npm run snapshots` (FND-81). Opening one works every root out again against its
 * digest; rerunning it with its own versions must match at every commit, and with the newest at
 * every commit too, until a new function version changes what a run does, which then shows the
 * first commit it affects. Make them again only when a new function version is added.
 */

/** Each kept run, by the built-in scenario it is a run of. */
const KEPT: ReadonlyMap<string, unknown> = new Map([
    ['demonstration', DEMONSTRATION],
    ['one-order', ONE_ORDER],
]);

/** Mark ready changed on purpose: each order version names the run's start as its maker. */
const START_MAKER = Maker.runStart();
const changedMarkReady: typeof OrdersState.markReady = (state, at, orderId) =>
    OrdersState.markReady(state, at, orderId, START_MAKER);

/**
 * Comparing a whole run's roots can take seconds under a loaded coverage run, and the
 * demonstration's run, with its drivers' apps sending, has thousands of commits.
 */
const WHOLE_RUN_TIMEOUT_MS = 120_000;

/** A kept run, migrated, checked, and opened, which works every root out again. */
function opened(record: unknown): IRunState {
    const body = migrated(record);
    if (!isPersistedSavedRunBody(body)) {
        throw new Error('A kept run is not of the shape this release writes.');
    }
    return fromPersistedRun(body.run, REGISTERED_FUNCTIONS);
}

describe("the repository's kept runs", () => {
    it('keep a run of every built-in scenario', () => {
        const builtIns = new BundledScenarios().list();

        const ids = builtIns.map((builtIn) => builtIn.id).toArray();

        const kept = [...KEPT.keys()];
        expect(kept).toEqual(ids);
    });

    it.each([...KEPT])(
        'rerun %s with its own versions and the newest, matching at every commit',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        (_id, record) => {
            const run = opened(record);

            const own = snapshotTest(run, SnapshotVersions.Own);
            const newest = snapshotTest(run, SnapshotVersions.Newest);

            expect(own.compared).toBeGreaterThan(0);
            expect(own.difference).toBeNull();
            expect(newest.difference).toBeNull();
        },
    );

    it('show the first commit a behaviour change affects, rerun with the newest versions', () => {
        const run = opened(ONE_ORDER);
        const lookup = new TableFunctionLookup({
            ...TODAYS_FUNCTIONS,
            [FunctionName.OrdersMarkReady]: [OrdersState.markReady, changedMarkReady],
        });

        const newest = snapshotTest(run, SnapshotVersions.Newest, lookup);

        const commits = run.line.commits.valueSeq();
        const marked = commits.find((commit) => commit.call?.fn === OrdersState.markReady);
        expect(newest.difference?.commit).toBe(marked?.id);
    });
});
