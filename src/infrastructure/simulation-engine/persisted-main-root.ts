import { List, OrderedMap } from 'immutable';

import type { PersistedDeliveriesRules } from '../drivers/deliveries/persisted-deliveries-rules';
import {
    fromPersistedDeliveriesRules,
    toPersistedDeliveriesRules,
} from '../drivers/deliveries/persisted-deliveries-rules';
import type { PersistedDriversRules } from '../drivers/persisted-drivers-rules';
import {
    fromPersistedDriversRules,
    toPersistedDriversRules,
} from '../drivers/persisted-drivers-rules';
import type { PersistedOrdersRules } from '../orders/persisted-orders-rules';
import {
    fromPersistedOrdersRules,
    toPersistedOrdersRules,
} from '../orders/persisted-orders-rules';
import { toOrderId } from '../../domain/orders/order';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { RandomStream } from '../../domain/simulation-engine/random-stream';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import { unreachable } from '../../domain/system/validation/unreachable';
import type { CommandRefusal } from '../../application-core/simulation-engine/command-outcome';
import type {
    DirectEffect,
    InputResponse,
} from '../../application-core/simulation-engine/direct-effect';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import type { IEffectsRoot, IMainRoot } from '../../application-core/simulation-engine/main-root';
import { toCommitId } from '../../application-core/simulation-engine/commit-id';
import type { PersistedIndirectEffect } from './persisted-indirect-effect';
import {
    fromPersistedIndirectEffect,
    toPersistedIndirectEffect,
} from './persisted-indirect-effect';
import type { IRunValues } from '../../application-core/simulation-engine/run-values';
import type { RunJob } from '../../application-core/simulation-engine/run-work';
import type { InputCommand } from '../../application-core/simulation-engine/input-command';
import type { IPersistedDeliveriesState } from '../drivers/deliveries/persisted-deliveries-state';
import type { IPersistedDriversState } from '../drivers/persisted-drivers-state';
import {
    fromPersistedDriversState,
    toPersistedDriversState,
} from '../drivers/persisted-drivers-state';
import {
    fromPersistedDeliveriesState,
    toPersistedDeliveriesState,
} from '../drivers/deliveries/persisted-deliveries-state';
import type { IPersistedOrdersState } from '../orders/persisted-orders-state';
import {
    fromPersistedOrdersState,
    toPersistedOrdersState,
} from '../orders/persisted-orders-state';
import { toRandomWord, toSeed } from '../../domain/simulation-engine/numbers';
import { toCount } from '../../domain/system/math/math';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

/** The config values in use, persisted. */
export interface IPersistedRunValues {
    readonly drivers: PersistedDriversRules;
    readonly orders: PersistedOrdersRules;
    readonly deliveries: PersistedDeliveriesRules;
}

/** A consumer's call's response, persisted. */
export type PersistedInputResponse =
    | { readonly isOk: true; readonly orderId: string | null }
    | { readonly isOk: false; readonly refusal: CommandRefusal };

/** A consumer's call to the service, persisted. */
export interface IPersistedInputEffect {
    readonly kind: typeof EffectKind.Input;
    readonly at: number;
    readonly actor: string;
    readonly command: InputCommand;
    readonly order: string;
    readonly response: PersistedInputResponse;
    readonly followsFrom: string | null;
}

/** A job's run, persisted. */
export interface IPersistedJobEffect {
    readonly kind: typeof EffectKind.Job;
    readonly at: number;
    readonly job: RunJob;
    readonly stateCommits: number;
}

/** A config change, persisted. */
export interface IPersistedConfigChangeEffect {
    readonly kind: typeof EffectKind.ConfigChange;
    readonly at: number;
    readonly isScripted: boolean;
    readonly before: IPersistedRunValues;
    readonly after: IPersistedRunValues;
}

/** A direct effect, persisted. */
export type PersistedDirectEffect =
    IPersistedInputEffect | IPersistedJobEffect | IPersistedConfigChangeEffect;

/** Where one named random stream has got to, persisted. */
export interface IPersistedRandomStream {
    readonly name: string;
    readonly wordA: number;
    readonly wordB: number;
    readonly wordC: number;
    readonly wordD: number;
}

/** The randomness part, persisted: the seed, and each stream drawn from. */
export interface IPersistedRandomness {
    readonly seed: number;
    readonly streams: readonly IPersistedRandomStream[];
}

/** The effects sub-root, persisted. */
export interface IPersistedEffectsRoot {
    readonly direct: {
        readonly records: readonly PersistedDirectEffect[];
        readonly values: IPersistedRunValues;
    };
    readonly indirect: { readonly records: readonly PersistedIndirectEffect[] };
    readonly randomness: IPersistedRandomness;
}

/** A main root, persisted with both its sub-roots. */
export interface IPersistedMainRoot {
    readonly state: {
        readonly orders: IPersistedOrdersState;
        readonly drivers: IPersistedDriversState;
        readonly deliveries: IPersistedDeliveriesState;
    };
    readonly effects: IPersistedEffectsRoot;
}

/** The config values in use, persisted. */
export const toPersistedRunValues = (values: IRunValues): IPersistedRunValues => ({
    drivers: toPersistedDriversRules(values.drivers),
    orders: toPersistedOrdersRules(values.orders),
    deliveries: toPersistedDeliveriesRules(values.deliveries),
});

/** The config values in use, from their persisted form. */
export const fromPersistedRunValues = (values: IPersistedRunValues): IRunValues => ({
    drivers: fromPersistedDriversRules(values.drivers),
    orders: fromPersistedOrdersRules(values.orders),
    deliveries: fromPersistedDeliveriesRules(values.deliveries),
});

const fromPersistedResponse = (response: PersistedInputResponse): InputResponse =>
    response.isOk
        ? { isOk: true, orderId: response.orderId === null ? null : toOrderId(response.orderId) }
        : { isOk: false, refusal: response.refusal };

/** A direct effect, persisted. */
export function toPersistedDirectEffect(effect: DirectEffect): PersistedDirectEffect {
    switch (effect.kind) {
        case EffectKind.Input:
            return { ...effect, at: effect.at.milliseconds, response: { ...effect.response } };
        case EffectKind.Job:
            return { ...effect, at: effect.at.milliseconds };
        case EffectKind.ConfigChange: {
            const before = toPersistedRunValues(effect.before);
            const after = toPersistedRunValues(effect.after);
            const { isScripted } = effect;
            return { kind: effect.kind, at: effect.at.milliseconds, isScripted, before, after };
        }
        default:
            return unreachable(effect);
    }
}

/** A direct effect, from its persisted form. */
export function fromPersistedDirectEffect(effect: PersistedDirectEffect): DirectEffect {
    switch (effect.kind) {
        case EffectKind.Input:
            return {
                ...effect,
                at: toSimTime(effect.at),
                actor: toInputActor(effect.actor),
                order: toInputOrderName(effect.order),
                response: fromPersistedResponse(effect.response),
                followsFrom: effect.followsFrom === null ? null : toCommitId(effect.followsFrom),
            };
        case EffectKind.Job:
            return {
                ...effect,
                at: toSimTime(effect.at),
                stateCommits: toCount(effect.stateCommits),
            };
        case EffectKind.ConfigChange: {
            const before = fromPersistedRunValues(effect.before);
            const after = fromPersistedRunValues(effect.after);
            const at = toSimTime(effect.at);
            return { kind: effect.kind, at, isScripted: effect.isScripted, before, after };
        }
        default:
            return unreachable(effect);
    }
}

const toPersistedRandomness = (random: SeededRandom): IPersistedRandomness => ({
    seed: random.seed,
    streams: random.streams
        .entrySeq()
        .map(([name, stream]) => ({
            name,
            wordA: stream.wordA,
            wordB: stream.wordB,
            wordC: stream.wordC,
            wordD: stream.wordD,
        }))
        .toArray(),
});

function fromPersistedRandomness(random: IPersistedRandomness): SeededRandom {
    const streams = random.streams.map((stream): [string, RandomStream] => [
        stream.name,
        RandomStream.create({
            wordA: toRandomWord(stream.wordA),
            wordB: toRandomWord(stream.wordB),
            wordC: toRandomWord(stream.wordC),
            wordD: toRandomWord(stream.wordD),
        }),
    ]);
    const named = OrderedMap(streams);
    const seed = toSeed(random.seed);
    return SeededRandom.create({ seed, streams: named });
}

const toPersistedEffects = (effects: IEffectsRoot): IPersistedEffectsRoot => ({
    direct: {
        records: effects.direct.records.map(toPersistedDirectEffect).toArray(),
        values: toPersistedRunValues(effects.direct.values),
    },
    indirect: { records: effects.indirect.records.map(toPersistedIndirectEffect).toArray() },
    randomness: toPersistedRandomness(effects.randomness),
});

function fromPersistedEffects(effects: IPersistedEffectsRoot): IEffectsRoot {
    const direct = effects.direct.records.map(fromPersistedDirectEffect);
    const indirect = effects.indirect.records.map(fromPersistedIndirectEffect);
    return {
        direct: { records: List(direct), values: fromPersistedRunValues(effects.direct.values) },
        indirect: { records: List(indirect) },
        randomness: fromPersistedRandomness(effects.randomness),
    };
}

/** A main root, persisted with both its sub-roots. */
export const toPersistedMainRoot = (root: IMainRoot): IPersistedMainRoot => ({
    state: {
        orders: toPersistedOrdersState(root.state.orders),
        drivers: toPersistedDriversState(root.state.drivers),
        deliveries: toPersistedDeliveriesState(root.state.deliveries),
    },
    effects: toPersistedEffects(root.effects),
});

/** A main root, from its persisted form. */
export const fromPersistedMainRoot = (root: IPersistedMainRoot): IMainRoot => ({
    state: {
        orders: fromPersistedOrdersState(root.state.orders, toSimTime),
        drivers: fromPersistedDriversState(root.state.drivers, toSimTime),
        deliveries: fromPersistedDeliveriesState(root.state.deliveries, toSimTime),
    },
    effects: fromPersistedEffects(root.effects),
});
