import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { tunedDriversRules } from '../../domain/drivers/drivers-rules.testing';
import { V1_DRIVERS_RULES } from '../../domain/drivers/drivers-rules';
import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { DriversState } from '../../domain/drivers/drivers-state';
import type { RunLogEntry } from './run-log-entry';
import { OrdersState } from '../../domain/orders/orders-state';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import type { ICommit } from './commit';
import { CommitKind } from './commit';
import type { DirectEffect } from './direct-effect';
import { EffectKind } from './direct-effect';
import type { IMainRoot } from './main-root';
import { restaurantPlaceOf } from '../../domain/restaurants/restaurant-place.testing';
import { createMainRoot, withDirectEffect, withOrders } from './main-root';
import { commandIssued } from './run-log-entries.testing';
import { RunJob } from './run-work';
import type { IStateCall } from './state-call';
import type { ICommitLine } from './commit-line';
import {
    closeSession,
    commitDirectEffect,
    commitState,
    createCommitLine,
    headAt,
    headRoot,
    openSession,
} from './commit-line';
import { toInputActor, toInputOrderName } from './run-input';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toCount } from '../../domain/system/math/math';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { V1_DELIVERIES_RULES } from '../../domain/drivers/deliveries/deliveries-rules';
import { V1_ORDERS_RULES } from '../../domain/orders/orders-rules';

const NO_ENTRIES = List<RunLogEntry>();
const CALL: IStateCall = { fn: (state: OrdersState): OrdersState => state, args: [] };
const VALUES = {
    drivers: V1_DRIVERS_RULES,
    orders: V1_ORDERS_RULES,
    deliveries: V1_DELIVERIES_RULES,
};

const JOB_RUN: DirectEffect = {
    kind: EffectKind.Job,
    at: toSimTime(0),
    job: RunJob.OrdersInbox,
    stateCommits: toCount(0),
};

function startRoot(): IMainRoot {
    const state = {
        orders: OrdersState.createNew(),
        drivers: DriversState.createNew(),
        deliveries: DeliveriesState.createNew(),
    };
    const seed = toSeed(1);
    const randomness = SeededRandom.createNew(seed);
    return createMainRoot(state, VALUES, randomness);
}
/** A root whose orders hold one more order. */
function changedState(root: IMainRoot): IMainRoot {
    const restaurant = restaurantPlaceOf();
    const at = toSimTime(0);
    const { state } = OrdersState.createOrder(root.state.orders, at, restaurant);
    return withOrders(root, state);
}
/** A state commit in a session of its own, or the same line when there is none. */
function commitFrom(line: ICommitLine, root: IMainRoot, at: number): ICommitLine {
    const before = headRoot(line);
    const secondAt = toSimTime(at);
    const opened = openSession(line, secondAt);
    const committed = commitState(opened, before, root, CALL, NO_ENTRIES);
    return committed === opened ? line : closeSession(committed);
}
function effectFrom(line: ICommitLine, effect: DirectEffect = JOB_RUN): ICommitLine {
    const before = headRoot(line);
    return commitDirectEffect(line, before, effect, NO_ENTRIES).line;
}
const commits = (line: ICommitLine): ICommit[] => line.commits.valueSeq().toArray();

describe('a line', () => {
    it('starts with no commits, at the root it was given', () => {
        const start = startRoot();

        const line = createCommitLine(start);

        expect(line.commits.size).toBe(0);
        expect(line.head).toBeNull();
        const mainRoot = headRoot(line);
        expect(mainRoot).toBe(start);
    });

    it('makes no state commit when the state did not change', () => {
        const start = startRoot();
        const line = createCommitLine(start);

        const secondLine = commitFrom(line, start, 5);
        expect(secondLine).toBe(line);
    });

    it('makes no state commit for a new root holding the same sub-roots', () => {
        const start = startRoot();
        const line = createCommitLine(start);

        const secondLine = commitFrom(line, { ...start }, 5);
        expect(secondLine).toBe(line);
    });

    it('makes a state commit when the state changed', () => {
        const start = startRoot();
        const root = changedState(start);

        const secondLine = createCommitLine(start);
        const line = commitFrom(secondLine, root, 5);

        expect(line.head).toBe('commit-1');
        const commit = line.commits.get(line.head!);
        expect(commit).toEqual({
            id: 'commit-1',
            kind: CommitKind.State,
            parent: null,
            session: 'session-1',
            at: toSimTime(5),
            root,
            effect: null,
            indirect: null,
            call: CALL,
            entries: NO_ENTRIES,
        });
    });

    it('makes a state commit at the time of the session it is in', () => {
        const start = startRoot();
        const line = createCommitLine(start);
        const root = changedState(start);

        const committed = commitFrom(line, root, 9);

        const at = headAt(committed);
        expect(at.milliseconds).toBe(9);
    });

    it('holds the log entries it is given', () => {
        const start = startRoot();
        const entry: RunLogEntry = {
            sequence: toLogSequence(0),
            at: toSimTime(5),
            causedBy: null,
            trace: toLogSequence(0),
            ...commandIssued('create-order'),
        };
        const entries = List.of(entry);
        const line = createCommitLine(start);
        const at = toSimTime(5);
        const opened = openSession(line, at);
        const root = changedState(start);

        const committed = commitState(opened, start, root, CALL, entries);

        expect(commits(committed)[0]?.entries).toBe(entries);
    });

    it('stops on a state commit outside a job run or API call, as that is a bug', () => {
        const start = startRoot();
        const line = createCommitLine(start);
        const root = changedState(start);

        expect(() => commitState(line, start, root, CALL, NO_ENTRIES)).toThrow(
            'A state commit happens inside a job run or API call.',
        );
    });

    it('is at time 0 before its first commit', () => {
        const start = startRoot();

        const line = createCommitLine(start);

        const at = headAt(line);
        expect(at.milliseconds).toBe(0);
    });

    it('stops on a state commit changing the effects as well, as that is a bug', () => {
        const start = startRoot();
        const root = changedState(start);
        const both = withDirectEffect(root, JOB_RUN);

        expect(() => {
            const line = createCommitLine(start);
            return commitFrom(line, both, 5);
        }).toThrow('A state commit cannot change the effects.');
    });

    it('stops on a state commit changing only the effects, too', () => {
        const start = startRoot();

        expect(() => {
            const line = createCommitLine(start);
            const root = withDirectEffect(start, JOB_RUN);
            return commitFrom(line, root, 5);
        }).toThrow('A state commit cannot change the effects.');
    });

    it('points each commit back at the one before it', () => {
        const start = startRoot();
        const line = createCommitLine(start);
        const root = changedState(start);
        const secondLine = commitFrom(line, root, 5);

        const second = effectFrom(secondLine);

        const secondCommits = commits(second).map((commit) => [commit.id, commit.parent]);
        expect(secondCommits).toEqual([
            ['commit-1', null],
            ['commit-2', 'commit-1'],
        ]);
    });

    it('keeps every commit with its own root', () => {
        const start = startRoot();
        const one = changedState(start);
        const two = changedState(one);
        const line = createCommitLine(start);
        const secondLine = commitFrom(line, one, 5);

        const second = commitFrom(secondLine, two, 6);

        expect(commits(second)[0]?.root).toBe(one);
        expect(commits(second)[1]?.root).toBe(two);
    });

    it('leaves the line it was given as it was', () => {
        const start = startRoot();
        const line = createCommitLine(start);

        const root = changedState(start);
        commitFrom(line, root, 5);

        expect(line.head).toBeNull();
        expect(line.commits.size).toBe(0);
    });
});

describe('an effect commit', () => {
    it.each<[string, DirectEffect, CommitKind]>([
        ['a job run', JOB_RUN, CommitKind.Job],
        [
            'an API call',
            {
                kind: EffectKind.Input,
                at: toSimTime(0),
                actor: toInputActor('d'),
                command: 'accept',
                order: toInputOrderName('A'),
                response: { isOk: true, orderId: null },
                followsFrom: null,
            },
            CommitKind.Input,
        ],
        [
            'a config change',
            {
                kind: EffectKind.ConfigChange,
                at: toSimTime(0),
                isScripted: false,
                before: VALUES,
                after: VALUES,
            },
            CommitKind.ConfigChange,
        ],
    ])('can be told apart, for %s', (_name, effect, kind) => {
        const start = startRoot();
        const line = createCommitLine(start);
        const secondLine = effectFrom(line, effect);
        expect(commits(secondLine)[0]?.kind).toBe(kind);
    });

    it('holds what crossed the boundary, and its time', () => {
        const effect: DirectEffect = { ...JOB_RUN, at: toSimTime(7) };

        const start = startRoot();
        const line = createCommitLine(start);
        const secondLine = effectFrom(line, effect);
        expect(commits(secondLine)[0]).toMatchObject({
            effect,
            at: toSimTime(7),
        });
    });

    it('adds a new effects sub-root and shares the state sub-root', () => {
        const start = startRoot();

        const line = createCommitLine(start);
        const { root } = commitDirectEffect(line, start, JOB_RUN, NO_ENTRIES);

        expect(root.effects).not.toBe(start.effects);
        expect(root.state).toBe(start.state);
    });

    it('keeps its effect in the direct part of the root', () => {
        const start = startRoot();

        const line = createCommitLine(start);
        const { root } = commitDirectEffect(line, start, JOB_RUN, NO_ENTRIES);

        const records = root.effects.direct.records.toArray();
        expect(records).toEqual([JOB_RUN]);
    });
});

describe('a session', () => {
    it('groups the commits made while it is open', () => {
        const start = startRoot();
        const secondLine = createCommitLine(start);
        const at = toSimTime(5);
        const opened = openSession(secondLine, at);

        const root = changedState(start);
        const thirdLine = commitState(opened, start, root, CALL, NO_ENTRIES);
        const line = effectFrom(thirdLine);

        const secondCommits = commits(line).map((commit) => commit.session);
        expect(secondCommits).toEqual(['session-1', 'session-1']);
    });

    it('leaves commits out of any group once closed', () => {
        const start = startRoot();

        const secondLine = createCommitLine(start);
        const at = toSimTime(5);
        const thirdLine = openSession(secondLine, at);
        const fourthLine = closeSession(thirdLine);
        const line = effectFrom(fourthLine);

        expect(commits(line)[0]?.session).toBeNull();
    });

    it('has a new identity each time', () => {
        const start = startRoot();
        const line = createCommitLine(start);
        const at = toSimTime(0);
        const secondLine = openSession(line, at);
        const once = closeSession(secondLine);

        const secondAt = toSimTime(0);
        expect(openSession(once, secondAt).session?.id).toBe('session-2');
    });
});

describe('a main root', () => {
    it('shares the effects with the root before it when the state changes', () => {
        const start = startRoot();

        const root = changedState(start);

        expect(root.state).not.toBe(start.state);
        expect(root.effects).toBe(start.effects);
    });

    it('copies only the direct part for a direct effect', () => {
        const start = startRoot();

        const root = withDirectEffect(start, JOB_RUN);

        expect(root.effects.indirect).toBe(start.effects.indirect);
        expect(root.effects.randomness).toBe(start.effects.randomness);
    });

    it('holds exactly the two sub-roots', () => {
        const start = startRoot();

        const fields = Object.keys(start);
        expect(fields).toEqual(['state', 'effects']);
    });

    it('keeps the seed and the stream positions in the randomness part', () => {
        const start = startRoot();

        const seed = toSeed(1);
        const random = SeededRandom.createNew(seed);
        expect(start.effects.randomness).toEqual(random);
        const parts = Object.keys(start.effects);
        expect(parts).toEqual(['direct', 'indirect', 'randomness']);
    });

    it('keeps the config values in the direct part, and a config change puts new ones in use', () => {
        const start = startRoot();
        const drivers = tunedDriversRules(
            V1_DRIVERS_RULES,
            DISPATCH_PASS,
            DISPATCH_PASS_INTERVAL,
            1000,
        );
        const after = { ...VALUES, drivers };

        const root = withDirectEffect(start, {
            kind: EffectKind.ConfigChange,
            at: toSimTime(0),
            isScripted: false,
            before: VALUES,
            after,
        });

        expect(start.effects.direct.values).toBe(VALUES);
        expect(root.effects.direct.values).toBe(after);
    });

    it('keeps the config values in use for any other direct effect', () => {
        const start = startRoot();

        const root = withDirectEffect(start, JOB_RUN);

        expect(root.effects.direct.values).toBe(VALUES);
    });

    it('stays the same root when given the orders it already has', () => {
        const start = startRoot();

        const mainRoot = withOrders(start, start.state.orders);
        expect(mainRoot).toBe(start);
    });

    it('lets two moments with the same state sub-root be seen as identical by one comparison', () => {
        const start = startRoot();

        const root = withDirectEffect(start, JOB_RUN);
        const later = withDirectEffect(root, JOB_RUN);

        expect(later.state).toBe(start.state);
    });
});
