import { List, OrderedMap } from 'immutable';

import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { DriversState } from '../../domain/drivers/drivers-state';
import type { DriversRules } from '../../domain/drivers/drivers-rules';
import { V1_DRIVERS_RULES } from '../../domain/drivers/drivers-rules';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { DeliveriesRules } from '../../domain/drivers/deliveries/deliveries-rules';
import { V1_DELIVERIES_RULES } from '../../domain/drivers/deliveries/deliveries-rules';
import type { OrdersRules } from '../../domain/orders/orders-rules';
import { V1_ORDERS_RULES } from '../../domain/orders/orders-rules';
import type { RunLogEntry } from './run-log-entry';
import type { RestaurantId } from '../../domain/restaurants/restaurant-place';
import { OrdersState } from '../../domain/orders/orders-state';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import type { DirectEffect } from './direct-effect';
import type { IndirectEffect } from './indirect-effect';
import type { IMainRoot } from './main-root';
import { createMainRoot } from './main-root';
import type { IRunCache } from './run-cache';
import type { IRunHistory } from './run-history';
import { createHistory } from './run-history';
import {
    emptyRunCache,
    noteEffectCommit,
    noteIndirectCommit,
    notePlace,
    takePendingEntries,
} from './run-cache';
import { required } from '../../domain/system/validation/required';
import type { IRunLog } from './run-log';
import type { IRunValues } from './run-values';
import type { ScriptInput } from './run-input';
import type { IStateCall } from './state-call';
import type { ICommitLine } from './commit-line';
import {
    closeSession,
    commitDirectEffect,
    commitIndirectEffect,
    commitState,
    createCommitLine,
    openSession,
} from './commit-line';
import type { Seed } from '../../domain/simulation-engine/numbers';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';

export type { RunLogEntry };

/** What a run starts from: its seed and, when tuned, its rule values. */
export interface IRunSettings {
    readonly seed: Seed;
    readonly driversRules?: DriversRules;
    readonly ordersRules?: OrdersRules;
    readonly deliveriesRules?: DeliveriesRules;
}

/** What a run's scenario says the actors do: who can act, and every step, in the order it runs. */
export interface IRunScript {
    readonly restaurants: OrderedMap<RestaurantId, RestaurantPlace>;
    readonly steps: List<ScriptInput>;
}

/**
 * A run, as one value. Its record is the line of commits, and the scenario's script is its
 * input. The root is the latest commit's, and the cache is worked out from the commits. Each step
 * gives a new run, so a snapshot is just a reference.
 */
export interface IRunState {
    readonly script: IRunScript;
    /** Every branch of the run, and which is current: the line of commits below (FND-87). */
    readonly history: IRunHistory;
    /** Every commit so far. */
    readonly line: ICommitLine;
    /** The main root the run has reached. */
    readonly root: IMainRoot;
    readonly cache: IRunCache;
}

/** A run with its log written further. The entries wait for the next commit to hold them. */
export const withLog = (run: IRunState, log: IRunLog): IRunState => ({
    ...run,
    cache: { ...run.cache, log },
});

/**
 * A run at this root, making a state commit if the state changed. One call of this is one
 * transaction: the commit holds the call that made it, and the entries written since the commit
 * before it. With no commit, those entries wait for the next.
 */
export function commitTo(run: IRunState, root: IMainRoot, call: IStateCall): IRunState {
    if (root === run.root) {
        return run;
    }
    const pending = takePendingEntries(run.cache);
    const line = commitState(run.line, run.root, root, call, pending.entries);
    if (line === run.line) {
        return run;
    }
    const head = required(line.head, 'the commit just made');
    const cache = notePlace(pending.cache, head);
    return { ...run, root, line, cache };
}

/** A run with a direct effect committed, holding the entries written since the commit before. */
export function commitEffect(run: IRunState, effect: DirectEffect): IRunState {
    const pending = takePendingEntries(run.cache);
    const committed = commitDirectEffect(run.line, run.root, effect, pending.entries);
    const position = toPosition(committed.line.commits.size);
    const head = required(committed.line.head, 'the commit just made');
    const placed = notePlace(pending.cache, head);
    return {
        ...run,
        root: committed.root,
        line: committed.line,
        cache: noteEffectCommit(placed, effect, position),
    };
}

/**
 * A run with an indirect effect committed, holding the entries written since the commit before.
 * The service takes no part in it, so the cache notes only its label, and the step it ran.
 */
export function commitIndirect(run: IRunState, indirect: IndirectEffect): IRunState {
    const pending = takePendingEntries(run.cache);
    const committed = commitIndirectEffect(run.line, run.root, indirect, pending.entries);
    const head = required(committed.line.head, 'the commit just made');
    const placed = notePlace(pending.cache, head);
    const cache = noteIndirectCommit(placed, indirect, head);
    return { ...run, root: committed.root, line: committed.line, cache };
}

/**
 * A run with a job run or API call started at a simulated time. Every commit until it finishes
 * belongs to it.
 */
export const startSession = (run: IRunState, at: SimTime): IRunState => ({
    ...run,
    line: openSession(run.line, at),
});

/** A run with its job run or API call finished. */
export const finishSession = (run: IRunState): IRunState => ({
    ...run,
    line: closeSession(run.line),
});

/** A run set up to start from this root, which is not a change in its history. */
export const startingFrom = (run: IRunState, root: IMainRoot): IRunState => ({
    ...run,
    root,
    line: createCommitLine(root),
    history: createHistory(),
});

/** The config values a run starts with: V1.0.0's, unless its settings tune them. */
export const startingValues = (settings: IRunSettings): IRunValues => ({
    drivers: settings.driversRules ?? V1_DRIVERS_RULES,
    orders: settings.ordersRules ?? V1_ORDERS_RULES,
    deliveries: settings.deliveriesRules ?? V1_DELIVERIES_RULES,
});

/** A new run, at time 0, with every job due. Its starting values sit in its start root. */
export function createRun(settings: IRunSettings): IRunState {
    const state = {
        orders: OrdersState.createNew(),
        drivers: DriversState.createNew(),
        deliveries: DeliveriesState.createNew(),
    };
    const values = startingValues(settings);
    const randomness = SeededRandom.createNew(settings.seed);
    const root = createMainRoot(state, values, randomness);
    const logEntries = List<RunLogEntry>();
    return {
        script: { restaurants: OrderedMap(), steps: List() },
        history: createHistory(),
        line: createCommitLine(root),
        root,
        cache: emptyRunCache(logEntries),
    };
}
