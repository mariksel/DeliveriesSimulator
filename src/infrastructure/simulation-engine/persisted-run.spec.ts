import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import { withDirectEffect } from '../../application-core/simulation-engine/main-root';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { startSession } from '../../application-core/simulation-engine/run-state';
import type { IStateCall } from '../../application-core/simulation-engine/state-call';
import { headAt } from '../../application-core/simulation-engine/commit-line';
import { registeredFunctionOf } from './persisted-call';
import type { IPersistedMaker } from '../system/records/persisted-maker';
import { toPersistedMaker } from '../system/records/persisted-maker';
import type { Maker } from '../../domain/system/records/maker';
import type { IVersion } from '../../domain/system/records/version-chain';
import { versionChain } from '../../domain/system/records/version-chain';
import type { IPersistedCommit, IPersistedRun } from './persisted-run';
import {
    atMinimum,
    commitCount,
    fromPersistedRun,
    fromPersistedRunInChunks,
    toPersistedRun,
} from './persisted-run';
import { REGISTERED_FUNCTIONS } from './function-registry';
import type { IRestoreProgress } from './persisted-run';
import {
    advance,
    forkedRun,
    forkedRunBackOnMain,
    indirectRun,
    oneOrderRun,
    riddenOrderRun,
    ridingRun,
    SAMPLE_CITY,
    startedOneOrder,
    variedRun,
} from './sample-runs.testing';

/** A version of any record, with the maker every version names. */
interface IMadeVersion extends IVersion<IMadeVersion> {
    readonly madeBy: Maker;
}

const SECOND = 1000;
/**
 * Comparing two whole runs field by field takes under a second, but more than 5 under a loaded
 * coverage run, so these tests get longer.
 */
const WHOLE_RUN_TIMEOUT_MS = 30_000;

/** Main's own commits, which are every commit of a run that never forked. */
const mainCommits = (persisted: IPersistedRun): readonly IPersistedCommit[] =>
    persisted.branches[0]!.commits;

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

/** Every version's maker on a run's current line, oldest version first, as plain values. */
function makersOf(run: IRunState): readonly IPersistedMaker[] {
    const { orders, drivers, deliveries } = run.root.state;
    const latest: readonly IVersion<IMadeVersion>[] = [
        ...orders.orderVersions.values(),
        ...orders.copyVersions.values(),
        ...drivers.driverVersions.values(),
        ...deliveries.deliveryVersions.values(),
        ...deliveries.notificationVersions.values(),
    ];
    return latest.flatMap((version) => {
        const chain = versionChain(version as IMadeVersion);
        return chain.map((each) => toPersistedMaker(each.madeBy)).toArray();
    });
}

/** A persisted version, with the versions before it that were saved with it. */
interface IChained {
    readonly previous: IChained | null;
}

/** How many versions a persisted version holds: itself, and each saved before it. */
const savedLength = (version: IChained): number =>
    version.previous === null ? 1 : 1 + savedLength(version.previous);

/** The sum of each record's latest version number, which counts every version it has had. */
const versionCount = (versions: Iterable<{ readonly number: number }>): number =>
    [...versions].reduce((sum, version) => sum + version.number, 0);

/** Every commit's root, beside the root before it on the line. */
function rootPairs(run: IRunState): readonly (readonly [IMainRoot, IMainRoot])[] {
    const commits = run.line.commits.valueSeq().toArray();
    const roots = [run.line.start, ...commits.map((commit) => commit.root)];
    return commits.map((commit, index) => [roots[index]!, commit.root] as const);
}

/** Which parts each commit's root shares with the root before it. */
const sharing = (run: IRunState): readonly (readonly boolean[])[] =>
    rootPairs(run).map(([parent, child]) => [
        child.state === parent.state,
        child.state.orders === parent.state.orders,
        child.state.drivers === parent.state.drivers,
        child.state.deliveries === parent.state.deliveries,
        child.effects === parent.effects,
        child.effects.direct.values === parent.effects.direct.values,
        child.effects.randomness === parent.effects.randomness,
    ]);

/** Whether each order version follows the very one the root before it holds, if it holds one. */
const isChainedToParent = ([parent, child]: readonly [IMainRoot, IMainRoot]): boolean =>
    child.state.orders.orderVersions.every((version, id) => {
        const before = parent.state.orders.orderVersions.get(id);
        const chain = versionChain(version);
        return before === undefined || chain.some((each) => each === before);
    });

describe('a persisted run', () => {
    it.each<[string, () => IRunState]>([
        ['the one-order run', (): IRunState => oneOrderRun()],
        ['a run with a refused call and a config change', variedRun],
        ['a run with a fork, on the fork', forkedRun],
        ['a run with a fork, back on Main', forkedRunBackOnMain],
        ['a run with an indirect commit', indirectRun],
        ["a run whose driver's app sends its location", ridingRun],
        ['a run whose driver rides, and whose pick-up waits for them', riddenOrderRun],
    ])('maps back exactly, for %s', { timeout: WHOLE_RUN_TIMEOUT_MS }, (_name, make) => {
        const run = make();

        const persisted = toPersistedRun(run);
        const loaded = fromPersistedRun(persisted);

        expect(loaded).toEqual(run);
    });

    it("keeps the city in the run's script, not in any commit", () => {
        const run = oneOrderRun();

        const persisted = toPersistedRun(run);
        const loaded = fromPersistedRun(persisted);

        expect(run.script.city).toBe(SAMPLE_CITY);
        expect(persisted.script.city).toMatchObject({ across: 2, down: 2 });
        expect(loaded.script.city).toEqual(SAMPLE_CITY);
    });

    it('has no city for a run saved before runs had cities', () => {
        const run = oneOrderRun();
        const persisted = toPersistedRun(run);
        const fields = Object.entries(persisted.script).filter(([key]) => key !== 'city');
        const withoutCity = Object.fromEntries(fields) as typeof persisted.script;
        const older = { ...persisted, script: withoutCity };

        const loaded = fromPersistedRun(older);

        expect(loaded.script.city).toBeNull();
    });

    it('keeps every commit once, each branch holding its own after its fork', () => {
        const run = forkedRun();

        const persisted = toPersistedRun(run);

        const [main, fork] = persisted.branches;
        const mainLength = main!.commits.length;
        const forkOwn = fork!.commits.length;
        expect(main).toMatchObject({ id: 'main', name: 'Main', forkedFrom: null, forkedAt: 0 });
        expect(fork).toMatchObject({ id: 'fork-1', name: 'Fork 1', forkedFrom: 'main' });
        expect(fork!.forkedAt + forkOwn).toBe(run.line.commits.size);
        expect(mainLength).toBeGreaterThan(fork!.forkedAt);
        expect(persisted.current).toBe('fork-1');
    });

    it(
        "keeps every version's maker through saving and loading",
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        () => {
            const run = forkedRun();

            const persisted = toPersistedRun(run);
            const loaded = fromPersistedRun(persisted);

            const before = makersOf(run);
            const after = makersOf(loaded);
            expect(before.length).toBeGreaterThan(0);
            expect(after).toEqual(before);
        },
    );

    it('gives the same persisted records when it is persisted again', () => {
        const run = variedRun();
        const persisted = toPersistedRun(run);

        const loaded = fromPersistedRun(persisted);
        const again = toPersistedRun(loaded);

        expect(again).toEqual(persisted);
    });

    it('saves each version once, without the versions the root before it holds', () => {
        const run = forkedRunBackOnMain();
        const { orders, drivers } = run.root.state;
        const start = run.line.start.state;
        const latest = [...orders.orderVersions.values(), ...drivers.driverVersions.values()];
        const atStart = [
            ...start.orders.orderVersions.values(),
            ...start.drivers.driverVersions.values(),
        ];

        const persisted = toPersistedRun(run);

        const mainOwn = mainCommits(persisted);
        const saved = mainOwn.flatMap((commit) => {
            const orderSets = commit.change?.orders?.orderVersions?.set ?? [];
            const driverSets = commit.change?.drivers?.driverVersions?.set ?? [];
            return [...orderSets, ...driverSets].map(([, version]) => savedLength(version));
        });
        const total = saved.reduce((sum, length) => sum + length, 0);
        const expected = versionCount(latest) - versionCount(atStart);
        expect(total).toBe(expected);
    });

    it(
        'shares between loaded roots every part the saved run shared, and versions with them',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        () => {
            const run = forkedRun();
            const persisted = toPersistedRun(run);

            const loaded = fromPersistedRun(persisted);

            const pairs = rootPairs(loaded);
            const loadedSharing = sharing(loaded);
            const savedSharing = sharing(run);
            const lost = savedSharing.flatMap((parts, commit) =>
                parts.flatMap((isShared, part) =>
                    isShared && loadedSharing[commit]?.[part] !== true ? [[commit, part]] : [],
                ),
            );
            const isChained = pairs.every(isChainedToParent);
            expect(loadedSharing).toHaveLength(savedSharing.length);
            expect(lost).toEqual([]);
            expect(isChained).toBe(true);
        },
    );

    it("puts a loaded effect commit's own effect in its root, not a copy", () => {
        const run = variedRun();
        const persisted = toPersistedRun(run);

        const loaded = fromPersistedRun(persisted);

        const commits = loaded.line.commits.valueSeq().toArray();
        const withEffect = commits.filter((commit) => commit.effect !== null);
        const isOwn = withEffect.every(
            (commit) => commit.root.effects.direct.records.last() === commit.effect,
        );
        expect(withEffect.length).toBeGreaterThan(0);
        expect(isOwn).toBe(true);
    });

    it("refuses a commit whose root holds effects other than its own and its parent's", () => {
        const run = variedRun();
        const commits = run.line.commits.valueSeq();
        const stateCommit = commits.find((commit) => commit.kind === CommitKind.State)!;
        const effect = commits.find((commit) => commit.effect !== null)!.effect!;
        const root = withDirectEffect(stateCommit.root, effect);
        const changed = run.line.commits.set(stateCommit.id, { ...stateCommit, root });
        const tampered = { ...run, line: { ...run.line, commits: changed } };

        expect(() => toPersistedRun(tampered)).toThrow('effects other than its own');
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
        const main = persisted.branches[0]!;
        const commits = main.commits.map((commit) =>
            commit.call === null
                ? commit
                : { ...commit, call: { ...commit.call, functionId: 'orders.gone@9' } },
        );

        const branches = [{ ...main, commits }];

        expect(() => fromPersistedRun({ ...persisted, branches })).toThrow('orders.gone@9');
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
            args: [call.args[0], new Date(0), call.args[2]],
        }));

        expect(() => toPersistedRun(notPlain)).toThrow('plain data');
    });

    it.each<[string, string, number]>([
        ['a restaurant place', 'orders.create-order@1', 1],
        ['a handoff', 'drivers.deliveries.receive-delivery-request@1', 1],
        ['a moment', 'orders.create-order@1', 0],
        ['a maker', 'orders.request-delivery@1', 2],
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

/** A run persisted at minimum: at everything, then moved down. */
function minimumOf(run: IRunState): IPersistedRun {
    const everything = toPersistedRun(run);
    return { ...everything, branches: atMinimum(everything.branches) };
}

/** Every commit of a persisted run, branch after branch. */
const everyCommit = (persisted: IPersistedRun): readonly IPersistedCommit[] =>
    persisted.branches.flatMap((branch) => branch.commits);

/** A persisted run with one commit's digest changed, as if its root had come out otherwise. */
function withWrongDigest(persisted: IPersistedRun, at: number): IPersistedRun {
    const [main, ...rest] = persisted.branches;
    const commits = main!.commits.map((commit, index) =>
        index === at ? { ...commit, digest: '0000000000000000' } : commit,
    );
    return { ...persisted, branches: [{ ...main!, commits }, ...rest] };
}

describe('a run persisted at minimum', () => {
    it.each<[string, () => IRunState]>([
        ['the one-order run', (): IRunState => oneOrderRun()],
        ['a run with a refused call and a config change', variedRun],
        ['a run with a fork, on the fork', forkedRun],
        ['a run with a fork, back on Main', forkedRunBackOnMain],
        ['a run with an indirect commit', indirectRun],
    ])(
        'works every root out again, to the same run, for %s',
        { timeout: WHOLE_RUN_TIMEOUT_MS },
        (_name, make) => {
            const run = make();

            const persisted = minimumOf(run);
            const loaded = fromPersistedRun(persisted);

            expect(loaded).toEqual(run);
        },
    );

    it('keeps a digest in place of each change, and is smaller than at everything', () => {
        const run = forkedRun();

        const minimum = minimumOf(run);
        const everything = toPersistedRun(run);

        const commits = everyCommit(minimum);
        const isDigestOnly = commits.every(
            (commit) => commit.change === undefined && /^[0-9a-f]{16}$/.test(commit.digest ?? ''),
        );
        const minimumText = JSON.stringify(minimum);
        const everythingText = JSON.stringify(everything);
        expect(isDigestOnly).toBe(true);
        expect(minimumText.length).toBeLessThan(everythingText.length);
    });

    it("chains a fork's digests on from the commit it forked after", () => {
        const run = forkedRun();
        const everything = toPersistedRun(run);

        const minimum = minimumOf(run);

        const [main, fork] = minimum.branches;
        const [mainChanged, forkChanged] = everything.branches;
        const place = fork!.forkedAt;
        const isSameChange =
            JSON.stringify(forkChanged!.commits[0]!.change) ===
            JSON.stringify(mainChanged!.commits[place]!.change);
        const isSameDigest = fork!.commits[0]!.digest === main!.commits[place]!.digest;
        expect(place).toBeGreaterThan(0);
        expect(isSameDigest).toBe(isSameChange);
    });

    it('stops at a commit whose root works out differently from when it was saved', () => {
        const run = oneOrderRun();
        const persisted = minimumOf(run);
        const wrong = withWrongDigest(persisted, 3);

        const loading = (): IRunState => fromPersistedRun(wrong);

        expect(loading).toThrow('worked out differently from when it was saved');
    });

    it('tells its progress chunk by chunk, ending with every commit', async () => {
        const run = variedRun();
        const persisted = minimumOf(run);
        const told: IRestoreProgress[] = [];

        const loaded = await fromPersistedRunInChunks(
            persisted,
            REGISTERED_FUNCTIONS,
            (progress) => {
                told.push(progress);
            },
            10,
        );

        const total = commitCount(persisted);
        const dones = told.map((progress) => progress.done);
        const sorted = [...dones].sort((left, right) => left - right);
        expect(loaded).toEqual(run);
        expect(told.length).toBeGreaterThan(1);
        expect(dones).toEqual(sorted);
        const last = told.at(-1);
        expect(last).toEqual({ done: total, total });
    });
});
