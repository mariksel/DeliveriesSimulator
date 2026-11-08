import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import type { ICommit } from '../../application-core/simulation-engine/commit';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { startSession } from '../../application-core/simulation-engine/run-state';
import type { IStateCall } from '../../application-core/simulation-engine/state-call';
import { headAt } from '../../application-core/simulation-engine/commit-line';
import { registeredFunctionOf } from './persisted-call';
import type { IPersistedCommit, IPersistedRun } from './persisted-run';
import { fromPersistedRun, toPersistedRun } from './persisted-run';
import {
    advance,
    forkedRun,
    forkedRunBackOnMain,
    indirectRun,
    oneOrderRun,
    startedOneOrder,
    variedRun,
} from './sample-runs.testing';

const SECOND = 1000;
/**
 * Comparing two whole runs field by field takes under a second, but more than 5 under a loaded
 * coverage run, so these tests get longer.
 */
const WHOLE_RUN_TIMEOUT_MS = 30_000;

/** Main's own commits, which are every commit of a run that never forked. */
const mainCommits = (persisted: IPersistedRun): readonly IPersistedCommit[] =>
    persisted.timelines[0]!.commits;

function commitWith(persisted: IPersistedRun, functionId: string): IPersistedCommit | undefined {
    const commits = mainCommits(persisted);
    return commits.find((commit) => commit.call?.functionId === functionId);
}

const RECORD_READ = 'orders.record-deliveries-event-read@1';

const isCallOf = (commit: ICommit, functionId: string): boolean =>
    commit.call !== null && registeredFunctionOf(commit.call).id === functionId;

/** A run whose first commit of a function has its call changed. */
function withCallOf(
    run: IRunState,
    functionId: string,
    change: (call: IStateCall) => IStateCall,
): IRunState {
    const commit = run.line.commits.valueSeq().find((each) => isCallOf(each, functionId))!;
    const call = change(commit.call!);
    const commits = run.line.commits.set(commit.id, { ...commit, call });
    return { ...run, line: { ...run.line, commits } };
}

describe('a persisted run', () => {
    it.each<[string, () => IRunState]>([
        ['the one-order run', (): IRunState => oneOrderRun()],
        ['a run with a refused call and a config change', variedRun],
        ['a run with a fork, on the fork', forkedRun],
        ['a run with a fork, back on Main', forkedRunBackOnMain],
        ['a run with an indirect commit', indirectRun],
    ])('maps back exactly, for %s', { timeout: WHOLE_RUN_TIMEOUT_MS }, (_name, make) => {
        const run = make();

        const persisted = toPersistedRun(run);
        const loaded = fromPersistedRun(persisted);

        expect(loaded).toEqual(run);
    });

    it('keeps every commit once, each branch holding its own after its fork', () => {
        const run = forkedRun();

        const persisted = toPersistedRun(run);

        const [main, fork] = persisted.timelines;
        const mainLength = main!.commits.length;
        const forkOwn = fork!.commits.length;
        expect(main).toMatchObject({ id: 'main', name: 'Main', forkedFrom: null, forkedAt: 0 });
        expect(fork).toMatchObject({ id: 'fork-1', name: 'Fork 1', forkedFrom: 'main' });
        expect(fork!.forkedAt + forkOwn).toBe(run.line.commits.size);
        expect(mainLength).toBeGreaterThan(fork!.forkedAt);
        expect(persisted.current).toBe('fork-1');
    });

    it('gives the same persisted records when it is persisted again', () => {
        const run = variedRun();
        const persisted = toPersistedRun(run);

        const loaded = fromPersistedRun(persisted);
        const again = toPersistedRun(loaded);

        expect(again).toEqual(persisted);
    });

    it('is plain data, which JSON keeps exactly', () => {
        const run = variedRun();
        const persisted = toPersistedRun(run);

        const text = JSON.stringify(persisted);
        const parsed: unknown = JSON.parse(text);

        expect(parsed).toEqual(persisted);
    });

    it("holds each function by its stored ID, and never by the function's name", () => {
        const ran = oneOrderRun();
        const persisted = toPersistedRun(ran);

        const text = JSON.stringify(persisted);

        expect(text).toContain('"functionId":"orders.create-order@1"');
        expect(text).not.toContain('createOrder');
    });

    it('holds arguments from the parent root as where to find them there', () => {
        const ran = oneOrderRun();
        const persisted = toPersistedRun(ran);

        const commit = commitWith(persisted, RECORD_READ);

        const kinds = commit?.call?.args.map((argument) => argument.kind);
        expect(kinds).toEqual(['DeliveriesOutboxEvent', 'DeliveriesOutbox', 'OrdersRules']);
        expect(commit?.call?.args[0]).toHaveProperty('id');
    });

    it("gives a loaded commit's call the parent root's own outbox", () => {
        const ran = oneOrderRun();
        const persisted = toPersistedRun(ran);

        const loaded = fromPersistedRun(persisted);

        const commits = loaded.line.commits.valueSeq().toArray();
        const index = commits.findIndex((commit) => isCallOf(commit, RECORD_READ));
        const parent = commits[index - 1]!.root;
        expect(commits[index]?.call?.args[1]).toBe(parent.state.deliveries.outbox);
    });

    it('goes on from where it was saved, to the same end as a run that was never saved', () => {
        const whole = oneOrderRun();
        const half = oneOrderRun(100 * SECOND);

        const persisted = toPersistedRun(half);
        const loadedRun = fromPersistedRun(persisted);
        const resumed = advance(loadedRun, 300 * SECOND);

        const entries = resumed.cache.log.entries.toArray();
        const expected = whole.cache.log.entries.toArray();
        expect(entries).toEqual(expected);
        expect(resumed.line.commits.size).toBe(whole.line.commits.size);
    });

    it('maps a run with no commits', () => {
        const state = startedOneOrder();

        const persisted = toPersistedRun(state);

        const loaded = fromPersistedRun(persisted);
        expect(loaded).toEqual(state);
    });

    it('refuses a run in the middle of a job run or API call', () => {
        const state = oneOrderRun();
        const latest = headAt(state.line);
        const during = startSession(state, latest);

        expect(() => toPersistedRun(during)).toThrow('not during one');
    });

    it('refuses a function with no stored ID', () => {
        const state = oneOrderRun();
        const unknown = withCallOf(state, RECORD_READ, (call) => ({
            ...call,
            fn: (): null => null,
        }));

        expect(() => toPersistedRun(unknown)).toThrow('has no stored ID');
    });

    it('refuses a stored ID no function has', () => {
        const ran = oneOrderRun();
        const persisted = toPersistedRun(ran);
        const main = persisted.timelines[0]!;
        const commits = main.commits.map((commit) =>
            commit.call === null
                ? commit
                : { ...commit, call: { ...commit.call, functionId: 'orders.gone@9' } },
        );

        const timelines = [{ ...main, commits }];

        expect(() => fromPersistedRun({ ...persisted, timelines })).toThrow('orders.gone@9');
    });

    it('refuses the wrong number of arguments', () => {
        const state = oneOrderRun();
        const short = withCallOf(state, RECORD_READ, (call) => ({
            ...call,
            args: call.args.slice(1),
        }));

        expect(() => toPersistedRun(short)).toThrow('arguments');
    });

    it('refuses a value argument that is not plain data', () => {
        const state = oneOrderRun();
        const notPlain = withCallOf(state, 'orders.request-delivery@1', (call) => ({
            ...call,
            args: [call.args[0], new Date(0)],
        }));

        expect(() => toPersistedRun(notPlain)).toThrow('plain data');
    });

    it.each<[string, string, number]>([
        ['a restaurant place', 'orders.create-order@1', 1],
        ['a handoff', 'drivers.deliveries.receive-delivery-request@1', 1],
        ['a moment', 'orders.create-order@1', 0],
    ])('refuses %s argument that is not an instance of its class', (_name, functionId, index) => {
        const state = oneOrderRun();
        const plain = withCallOf(state, functionId, (call) => {
            const args = [...call.args];
            args[index] = { ...(call.args[index] as object) };
            return { ...call, args };
        });

        expect(() => toPersistedRun(plain)).toThrow('argument must be');
    });

    it("refuses an outbox argument that is not the parent root's own", () => {
        const state = oneOrderRun();
        const elsewhere = withCallOf(state, RECORD_READ, (call) => ({
            ...call,
            args: [call.args[0], List(), call.args[2]],
        }));

        expect(() => toPersistedRun(elsewhere)).toThrow("the parent root's own");
    });

    it("refuses an outbox event that is not in the parent root's outbox", () => {
        const state = oneOrderRun();
        const elsewhere = withCallOf(state, RECORD_READ, (call) => ({
            ...call,
            args: [{ id: 'elsewhere' }, ...call.args.slice(1)],
        }));

        expect(() => toPersistedRun(elsewhere)).toThrow('outbox');
    });
});
