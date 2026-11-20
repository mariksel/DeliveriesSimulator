import { List, OrderedMap } from 'immutable';

import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import { DriversState } from '../../domain/drivers/drivers-state';
import type { DriversRules } from '../../domain/drivers/drivers-rules';
import { V1_DRIVERS_RULES } from '../../domain/drivers/drivers-rules';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type {
    AddressId,
    DeliveryAddress,
} from '../../domain/restaurants/customers/delivery-address';
import type { Customer, CustomerId } from '../../domain/restaurants/customers/customer';
import type { DriverId } from '../../domain/drivers/driver';
import type { IRider } from './rider';
import type { DeliveriesRules } from '../../domain/drivers/deliveries/deliveries-rules';
import { V1_DELIVERIES_RULES } from '../../domain/drivers/deliveries/deliveries-rules';
import type { OrdersRules } from '../../domain/orders/orders-rules';
import { V1_ORDERS_RULES } from '../../domain/orders/orders-rules';
import type { RunLogEntry } from './run-log-entry';
import type { RestaurantId } from '../../domain/restaurants/restaurant-place';
import type { City } from '../../domain/map-and-routing/city';
import { OrdersState } from '../../domain/orders/orders-state';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import type { DirectEffect } from './direct-effect';
import type { IndirectEffect } from './indirect-effect';
import type { IMainRoot } from './main-root';
import type { FunctionLookup } from './function-lookup';
import { newestVersions } from './function-lookup';
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
import type { RecordVersion } from './record-ref';
import { noteMade } from './run-index';
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
    /** Finds each state function by name and version; the run starts with the newest (FND-81). */
    readonly functions: FunctionLookup;
    readonly driversRules?: DriversRules;
    readonly ordersRules?: OrdersRules;
    readonly deliveriesRules?: DeliveriesRules;
}

/**
 * What a run's scenario says: the city, who can act, and every step, in the order it runs. The
 * city sits here, not in the roots, so it changes no commit's digest (FND-90).
 */
export interface IRunScript {
    /** None for a run with no scenario, or saved before runs had cities. */
    readonly city: City | null;
    readonly restaurants: OrderedMap<RestaurantId, RestaurantPlace>;
    /** The restaurants' customers, whom create-order steps name (FND-90). */
    readonly customers: OrderedMap<CustomerId, Customer>;
    /**
     * The drivers the simulator rides, with how often each one's app sends its location and how
     * fast they ride; a driver with none sends nothing (FND-90).
     */
    readonly riders: OrderedMap<DriverId, IRider>;
    /** The customers' stored addresses, which create-order steps name. */
    readonly addresses: OrderedMap<AddressId, DeliveryAddress>;
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
    /**
     * Finds each state function by name and version, which every state call goes through with
     * the version the root holds. It is handed in, kept beside the cache, never saved (FND-81).
     */
    readonly functions: FunctionLookup;
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
export function commitTo(
    run: IRunState,
    root: IMainRoot,
    call: IStateCall,
    made: List<RecordVersion>,
): IRunState {
    if (root === run.root) {
        return run;
    }
    const pending = takePendingEntries(run.cache);
    const line = commitState(run.line, run.root, root, call, pending.entries);
    if (line === run.line) {
        return run;
    }
    const head = required(line.head, 'the commit just made');
    const session = required(line.session, 'the job run or API call under way');
    const placed = notePlace(pending.cache, head);
    const index = noteMade(placed.index, head, session.id, made);
    return { ...run, root, line, cache: { ...placed, index } };
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
export const startingValues = (
    settings: Pick<IRunSettings, 'driversRules' | 'ordersRules' | 'deliveriesRules'>,
): IRunValues => ({
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
    const versions = newestVersions(settings.functions);
    const root = createMainRoot(state, values, randomness, versions);
    const logEntries = List<RunLogEntry>();
    return {
        script: {
            city: null,
            restaurants: OrderedMap(),
            customers: OrderedMap(),
            riders: OrderedMap(),
            addresses: OrderedMap(),
            steps: List(),
        },
        history: createHistory(),
        line: createCommitLine(root),
        root,
        cache: emptyRunCache(logEntries),
        functions: settings.functions,
    };
}
