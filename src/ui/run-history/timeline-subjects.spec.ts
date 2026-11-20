import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { ICommit } from '../../application-core/simulation-engine/commit';
import { headAt } from '../../application-core/simulation-engine/commit-line';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import { stateIndirectEffect } from '../../application-core/simulation-engine/indirect-commit';
import {
    DRIVER_IGNORES,
    RESTAURANT_LATE,
} from '../../application-core/simulation-engine/indirect-effects.testing';
import { toInputOrderName } from '../../application-core/simulation-engine/input-names';
import type { IRunState, RunLogEntry } from '../../application-core/simulation-engine/run-state';
import type { SessionId } from '../../application-core/simulation-engine/session-id';
import {
    oneOrderRun,
    twoOrderRun,
} from '../../application/simulation-engine/one-order-run.testing';
import { TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { OrderId } from '../../domain/orders/order';
import type { ISubjectsOfCommit, SubjectId } from './timeline-subjects';
import { SubjectKind, SubjectWalk } from './timeline-subjects';

const A = toInputOrderName('A');
const B = toInputOrderName('B');
const ONE_ORDER = oneOrderRun();
const TWO_ORDERS = twoOrderRun();
const ORDER_A = ONE_ORDER.cache.orderIds.get(A)!;
const ORDER_A_OF_TWO = TWO_ORDERS.cache.orderIds.get(A)!;
const ORDER_B_OF_TWO = TWO_ORDERS.cache.orderIds.get(B)!;
const BOTH: readonly OrderId[] = [ORDER_A_OF_TWO, ORDER_B_OF_TWO];

const commitsOf = (run: IRunState): ICommit[] => run.line.commits.valueSeq().toArray();

/** Each commit of a run's line, with what a walk of a kind says it goes under. */
function walked(run: IRunState, kind: SubjectKind): [ICommit, ISubjectsOfCommit][] {
    const walk = new SubjectWalk(kind);
    const commits = commitsOf(run);
    return commits.map((commit) => [commit, walk.take(commit, run.cache.index)]);
}

/** What each job run or API call goes under once all its commits are walked, by its kind. */
function subjectsOfWork(run: IRunState, kind: SubjectKind): Map<SessionId, readonly SubjectId[]> {
    const bySession = new Map<SessionId, readonly SubjectId[]>();
    const met = walked(run, kind);
    met.forEach(([commit, { subjects }]) => {
        if (commit.session !== null) {
            bySession.set(commit.session, subjects);
        }
    });
    return bySession;
}

/** What each job run or API call whose effect commit passes a test goes under. */
function subjectsOfEffects(
    run: IRunState,
    kind: SubjectKind,
    test: (commit: ICommit) => boolean,
): (readonly SubjectId[])[] {
    const bySession = subjectsOfWork(run, kind);
    const commits = commitsOf(run);
    return commits.flatMap((commit) =>
        commit.session !== null && test(commit) ? [bySession.get(commit.session) ?? []] : [],
    );
}

const isAnyCall = (commit: ICommit): boolean => commit.effect?.kind === EffectKind.Input;
const isCall =
    (command: string) =>
    (commit: ICommit): boolean =>
        commit.effect?.kind === EffectKind.Input && commit.effect.command === command;
const isJob =
    (job: string) =>
    (commit: ICommit): boolean =>
        commit.effect?.kind === EffectKind.Job && commit.effect.job === job;
const isNotifying = (commit: ICommit): boolean =>
    commit.entries.some((entry) => entry.kind === TechnicalLogKind.NotificationSent);
const joined = (subjects: readonly SubjectId[]): string => subjects.join();
const sorted = (subjects: readonly SubjectId[]): readonly SubjectId[] => subjects.toSorted();

describe('which orders a commit goes under', () => {
    it('puts every API call under the order it names', () => {
        const calls = subjectsOfEffects(ONE_ORDER, SubjectKind.Order, isAnyCall);

        const named = calls.map(joined);
        const distinct = new Set(named);
        expect(calls.length).toBeGreaterThan(0);
        expect([...distinct]).toEqual([ORDER_A]);
    });

    it('puts a job run that handled two orders under both', () => {
        const isInbox = isJob('OrdersInbox');

        const inbox = subjectsOfEffects(TWO_ORDERS, SubjectKind.Order, isInbox);

        const both = inbox.filter((subjects) => subjects.length === 2);
        const each = both.map(sorted);
        const expected = sorted(BOTH);
        expect(both.length).toBeGreaterThan(0);
        expect(each).toContainEqual(expected);
    });

    it('puts a job run that touched no order under none', () => {
        const isRetry = isJob('HandoffRetry');

        const retries = subjectsOfEffects(ONE_ORDER, SubjectKind.Order, isRetry);

        const isNone = retries.every((subjects) => subjects.length === 0);
        expect(retries.length).toBeGreaterThan(0);
        expect(isNone).toBe(true);
    });

    it('marks where the ones first met start, so each is met once in its job run', () => {
        const met = walked(TWO_ORDERS, SubjectKind.Order);

        const firsts = new Map<SessionId, string>();
        met.forEach(([commit, { subjects, firstMet }]) => {
            if (commit.session !== null) {
                const before = firsts.get(commit.session) ?? '';
                const fresh = subjects.slice(firstMet);
                const added = joined(fresh);
                const parts = [before, added].filter(Boolean);
                const all = parts.join();
                firsts.set(commit.session, all);
            }
        });
        const final = subjectsOfWork(TWO_ORDERS, SubjectKind.Order);
        const pairs = [...final].map(([id, all]) => [id, joined(all)] as const);
        const expected = new Map(pairs);
        expect(firsts).toEqual(expected);
    });
});

describe('which drivers a commit goes under', () => {
    it('puts a dispatch pass under the driver it notified', () => {
        const notifying = subjectsOfEffects(ONE_ORDER, SubjectKind.Driver, isNotifying);

        expect(notifying).toEqual([['driver-1']]);
    });

    it("puts a driver's own API call under them", () => {
        const isAccept = isCall('accept');

        const accepts = subjectsOfEffects(TWO_ORDERS, SubjectKind.Driver, isAccept);

        const named = accepts.map(joined);
        expect(named).toEqual(['driver-1', 'driver-2']);
    });

    it('puts an API call that touched no driver under none', () => {
        const isCreate = isCall('create-order');

        const creates = subjectsOfEffects(ONE_ORDER, SubjectKind.Driver, isCreate);

        expect(creates).toEqual([[]]);
    });

    it('waits for a notification until the entry that sent it is walked', () => {
        const commits = commitsOf(ONE_ORDER);
        const notifying = commits.find(isNotifying)!;
        const unsent: ICommit = { ...notifying, entries: List<RunLogEntry>() };
        const walk = new SubjectWalk(SubjectKind.Driver);

        const before = walk.take(unsent, ONE_ORDER.cache.index);
        const after = walk.take(notifying, ONE_ORDER.cache.index);

        expect(before.subjects).toEqual([]);
        expect(after).toEqual({ subjects: ['driver-1'], firstMet: 0 });
    });
});

describe('what a commit outside any job run or API call goes under', () => {
    const at = headAt(ONE_ORDER.line);
    const ignored = stateIndirectEffect(ONE_ORDER, at, DRIVER_IGNORES);
    const stated = stateIndirectEffect(ignored, at, RESTAURANT_LATE);

    /** What the last two commits, both indirect, go under, by a kind. */
    function lastTwo(kind: SubjectKind): (readonly SubjectId[])[] {
        const met = walked(stated, kind);
        const last = met.slice(-2);
        return last.map(([, { subjects }]) => subjects);
    }

    it('goes under the order an indirect commit is about', () => {
        const byOrder = lastTwo(SubjectKind.Order);

        expect(byOrder).toEqual([[ORDER_A], [ORDER_A]]);
    });

    it('goes under the driver who ignored a request, and no driver for a late restaurant', () => {
        const byDriver = lastTwo(SubjectKind.Driver);

        expect(byDriver).toEqual([['driver-1'], []]);
    });

    it('goes under nothing for an order the run never created', () => {
        const order = toInputOrderName('no-such-order');
        const unknown = { ...DRIVER_IGNORES, order };
        const odd = stateIndirectEffect(ONE_ORDER, at, unknown);

        const met = walked(odd, SubjectKind.Order);

        const [, last] = met.at(-1)!;
        expect(last.subjects).toEqual([]);
    });

    it('goes under nothing for a config change', () => {
        const walk = new SubjectWalk(SubjectKind.Order);
        const [first] = commitsOf(ONE_ORDER);
        const lone = { ...first!, session: null, indirect: null };

        const met = walk.take(lone, ONE_ORDER.cache.index);

        expect(met.subjects).toEqual([]);
    });
});
