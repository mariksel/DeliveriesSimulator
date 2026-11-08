import { List } from 'immutable';

import type { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import type { DriversState } from '../../domain/drivers/drivers-state';
import type { OrdersState } from '../../domain/orders/orders-state';
import type { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import type { DirectEffect } from './direct-effect';
import type { IndirectEffect } from './indirect-effect';
import { EffectKind } from './direct-effect';
import type { IRunValues } from './run-values';

/**
 * The real service's state: this exists in the real service, and changes only in a transaction.
 */
export interface IStateRoot {
    readonly orders: OrdersState;
    readonly drivers: DriversState;
    readonly deliveries: DeliveriesState;
}

/** What the service took part in, in the order it happened, and the config values in use. */
export interface IDirectEffects {
    readonly records: List<DirectEffect>;
    readonly values: IRunValues;
}

/** What happened outside the service, which it took no part in. */
export interface IIndirectEffects {
    readonly records: List<IndirectEffect>;
}

/**
 * What crossed the service's boundary, and the randomness that decides what happens outside it. A
 * commit copies only the part it changes. A commit whose event draws a number saves the new
 * positions in the randomness part, with its own change.
 */
export interface IEffectsRoot {
    readonly direct: IDirectEffects;
    readonly indirect: IIndirectEffects;
    readonly randomness: SeededRandom;
}

/**
 * The root of one moment's state. It holds exactly its two sub-roots, and whatever a change leaves
 * alone is shared with the root before it.
 */
export interface IMainRoot {
    readonly state: IStateRoot;
    readonly effects: IEffectsRoot;
}

/** The root a run starts from, with no effects yet. */
export const createMainRoot = (
    state: IStateRoot,
    values: IRunValues,
    randomness: SeededRandom,
): IMainRoot => ({
    state,
    effects: {
        direct: { records: List(), values },
        indirect: { records: List() },
        randomness,
    },
});

/** A root with these orders. The same root comes back when they are the ones it already has. */
export const withOrders = (root: IMainRoot, orders: OrdersState): IMainRoot =>
    orders === root.state.orders ? root : { ...root, state: { ...root.state, orders } };

/** A root with these drivers. The same root comes back when they are the ones it already has. */
export const withDrivers = (root: IMainRoot, drivers: DriversState): IMainRoot =>
    drivers === root.state.drivers ? root : { ...root, state: { ...root.state, drivers } };

/**
 * A root with these deliveries. The same root comes back when they are the ones it already has.
 */
export const withDeliveries = (root: IMainRoot, deliveries: DeliveriesState): IMainRoot =>
    deliveries === root.state.deliveries
        ? root
        : { ...root, state: { ...root.state, deliveries } };

/** A start root with other config values in use, before any effect. */
export function withStartValues(root: IMainRoot, values: IRunValues): IMainRoot {
    const { direct } = root.effects;
    return { ...root, effects: { ...root.effects, direct: { ...direct, values } } };
}

/**
 * A root with one more direct effect, sharing the state, the indirect part, and the randomness
 * with the root before it. A config change also puts its values in use.
 */
export function withDirectEffect(root: IMainRoot, record: DirectEffect): IMainRoot {
    const { direct } = root.effects;
    const values = record.kind === EffectKind.ConfigChange ? record.after : direct.values;
    return {
        ...root,
        effects: { ...root.effects, direct: { records: direct.records.push(record), values } },
    };
}

/**
 * A root with one more indirect effect, sharing the state, the direct part, and the randomness
 * with the root before it.
 */
export function withIndirectEffect(root: IMainRoot, record: IndirectEffect): IMainRoot {
    const records = root.effects.indirect.records.push(record);
    return { ...root, effects: { ...root.effects, indirect: { records } } };
}
