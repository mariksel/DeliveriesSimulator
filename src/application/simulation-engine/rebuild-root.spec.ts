import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { TESTING_FUNCTIONS } from '../../application-core/simulation-engine/function-lookup.testing';
import { FunctionName } from '../../application-core/simulation-engine/function-name';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import {
    functionNameOf,
    rebuiltRoot,
} from '../../application-core/simulation-engine/rebuild-root';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import type { StateFunction } from '../../application-core/simulation-engine/state-call';
import { OrdersState } from '../../domain/orders/orders-state';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { HAPPY_PATH, START } from './one-order-run.testing';
import { SimulationRun } from './simulation-run';

const END = toSimTime(300_000);

/** The one-order run, to its end. */
function oneOrderRun(): IRunState {
    const created = createRun({ seed: toSeed(1), functions: TESTING_FUNCTIONS });
    const steps = List(HAPPY_PATH);
    const start = scheduleInputs(created, START, steps);
    const run = new SimulationRun(start);
    run.advanceTo(END);
    return run.state;
}

const RUN = oneOrderRun();
const COMMITS = RUN.line.commits.valueSeq().toArray();

/** Each commit beside the root before it. */
const withParents = (): readonly (readonly [IMainRoot, ICommit])[] =>
    COMMITS.map((commit, index) => [COMMITS[index - 1]?.root ?? RUN.line.start, commit] as const);

/** The kinds of commit a run holds, each once. */
function kindsOf(commits: readonly ICommit[]): readonly CommitKind[] {
    const kinds = commits.map((commit) => commit.kind);
    return [...new Set(kinds)];
}

describe("working a commit's root out again", () => {
    it('gives the same root for every commit of a run, from the root before it', () => {
        const pairs = withParents();

        const rebuilt = pairs.map(([parent, commit]) =>
            rebuiltRoot(parent, commit, TESTING_FUNCTIONS),
        );

        const own = COMMITS.map((commit) => commit.root);
        const kinds = kindsOf(COMMITS);
        expect(kinds).toContain(CommitKind.State);
        expect(kinds.length).toBeGreaterThan(1);
        expect(rebuilt).toEqual(own);
    });

    it("names a call's function by the version a lookup holds", () => {
        const fn: StateFunction = OrdersState.markReady;

        const name = functionNameOf(TESTING_FUNCTIONS, fn);

        expect(name).toBe(FunctionName.OrdersMarkReady);
    });

    it('refuses a function that is no version of any function', () => {
        const stray: StateFunction = (): null => null;

        expect(() => functionNameOf(TESTING_FUNCTIONS, stray)).toThrow('no version of any');
    });

    it('refuses a call whose function gives back no state of its module', () => {
        const [parent, commit] = withParents().find(([, each]) => each.call !== null)!;
        const call = { ...commit.call!, args: [] };

        const rebuilding = (): IMainRoot =>
            rebuiltRoot(parent, { ...commit, call }, TESTING_FUNCTIONS);

        expect(rebuilding).toThrow();
    });
});
