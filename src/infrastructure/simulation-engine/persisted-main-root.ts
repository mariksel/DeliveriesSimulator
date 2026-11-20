import { List, Map as ImmutableMap, OrderedMap } from 'immutable';

import type { FunctionVersions } from '../../application-core/simulation-engine/function-lookup';
import { isFunctionName } from '../../application-core/simulation-engine/function-name';
import { toVersionNumber } from '../../domain/system/records/version-chain';

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
    IAppSend,
    IImplementationChangeEffect,
    InputResponse,
} from '../../application-core/simulation-engine/direct-effect';
import {
    EffectKind,
    isLocationSent,
    isLocationsSent,
} from '../../application-core/simulation-engine/direct-effect';
import type {
    IEffectsRoot,
    IMainRoot,
    IStateRoot,
} from '../../application-core/simulation-engine/main-root';
import type { RecordVersion } from '../../application-core/simulation-engine/record-ref';
import { toCommitId } from '../../application-core/simulation-engine/commit-id';
import type { PersistedIndirectEffect } from './persisted-indirect-effect';
import {
    fromPersistedIndirectEffect,
    toPersistedIndirectEffect,
} from './persisted-indirect-effect';
import type { IRunValues } from '../../application-core/simulation-engine/run-values';
import type { RunJob } from '../../application-core/simulation-engine/run-work';
import type { OrderCommand } from '../../application-core/simulation-engine/input-command';
import { InputCommand } from '../../application-core/simulation-engine/input-command';
import type { IPersistedCoordinates } from '../map-and-routing/persisted-coordinates';
import {
    fromPersistedCoordinates,
    toPersistedCoordinates,
} from '../map-and-routing/persisted-coordinates';
import type { IPersistedDeliveriesState } from '../drivers/deliveries/persisted-deliveries-state';
import type { IPersistedDeliveriesChange } from '../drivers/deliveries/persisted-deliveries-state';
import type {
    IPersistedDriversChange,
    IPersistedDriversState,
} from '../drivers/persisted-drivers-state';
import {
    fromPersistedDriversChange,
    fromPersistedDriversState,
    toPersistedDriversChange,
    toPersistedDriversState,
} from '../drivers/persisted-drivers-state';
import {
    fromPersistedDeliveriesChange,
    fromPersistedDeliveriesState,
    toPersistedDeliveriesChange,
    toPersistedDeliveriesState,
} from '../drivers/deliveries/persisted-deliveries-state';
import type {
    IPersistedOrdersChange,
    IPersistedOrdersState,
} from '../orders/persisted-orders-state';
import {
    fromPersistedOrdersChange,
    fromPersistedOrdersState,
    toPersistedOrdersChange,
    toPersistedOrdersState,
} from '../orders/persisted-orders-state';
import { appliedValueChange, present, valueChange } from '../system/records/persisted-changes';
import { toRandomWord, toSeed } from '../../domain/simulation-engine/numbers';
import { toCount } from '../../domain/system/math/math';
import type { IPersistedVersionRead } from './persisted-version-read';
import { fromPersistedRead, toPersistedRead } from './persisted-version-read';
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
    readonly command: OrderCommand;
    readonly order: string;
    readonly response: PersistedInputResponse;
    readonly followsFrom: string | null;
    /** Absent for a run saved before scripted steps waited for their drivers (FND-90). */
    readonly isOnArrival?: boolean;
    readonly reads: readonly IPersistedVersionRead[];
}

/** One app's send among the apps due at one moment, persisted (FND-90). */
export interface IPersistedAppSend {
    readonly actor: string;
    readonly location: IPersistedCoordinates;
}

/** The apps due at one moment sending their locations, persisted (FND-90). */
export interface IPersistedLocationsSentEffect {
    readonly kind: typeof EffectKind.Input;
    readonly at: number;
    readonly command: typeof InputCommand.SendLocations;
    readonly sends: readonly IPersistedAppSend[];
    readonly response: PersistedInputResponse;
    readonly followsFrom: null;
    readonly reads: readonly IPersistedVersionRead[];
}

/** A driver's app sending its location alone, as runs saved before batching hold (FND-90). */
export interface IPersistedLocationSentEffect {
    readonly kind: typeof EffectKind.Input;
    readonly at: number;
    readonly actor: string;
    readonly command: typeof InputCommand.SendLocation;
    readonly location: IPersistedCoordinates;
    readonly response: PersistedInputResponse;
    readonly followsFrom: null;
    readonly reads: readonly IPersistedVersionRead[];
}

/** A job's run, persisted. */
export interface IPersistedJobEffect {
    readonly kind: typeof EffectKind.Job;
    readonly at: number;
    readonly job: RunJob;
    readonly stateCommits: number;
    readonly reads: readonly IPersistedVersionRead[];
}

/** A config change, persisted. */
export interface IPersistedConfigChangeEffect {
    readonly kind: typeof EffectKind.ConfigChange;
    readonly at: number;
    readonly isScripted: boolean;
    readonly before: IPersistedRunValues;
    readonly after: IPersistedRunValues;
    /** The indirect commit the change follows from, by its ID, or null (FND-89). */
    readonly followsFrom: string | null;
}

/** An implementation change, persisted: the version of each function before and after. */
export interface IPersistedImplementationChangeEffect {
    readonly kind: typeof EffectKind.ImplementationChange;
    readonly at: number;
    readonly isScripted: boolean;
    readonly before: readonly IPersistedFunctionVersion[];
    readonly after: readonly IPersistedFunctionVersion[];
    /** The indirect commit the switch follows from, by its ID, or null (FND-89). */
    readonly followsFrom: string | null;
}

/** A direct effect, persisted. */
export type PersistedDirectEffect =
    | IPersistedInputEffect
    | IPersistedLocationSentEffect
    | IPersistedLocationsSentEffect
    | IPersistedJobEffect
    | IPersistedConfigChangeEffect
    | IPersistedImplementationChangeEffect;

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

/** The version of one state function a run uses, persisted. */
export interface IPersistedFunctionVersion {
    readonly name: string;
    readonly version: number;
}

const toPersistedFunctionVersions = (
    versions: FunctionVersions,
): readonly IPersistedFunctionVersion[] =>
    versions
        .entrySeq()
        .map(([name, version]) => ({ name, version }))
        .toArray();

/** The versions of the functions a run uses, refusing a name no function has. */
function fromPersistedFunctionVersions(
    versions: readonly IPersistedFunctionVersion[],
): FunctionVersions {
    const pairs = versions.map((each) => {
        if (!isFunctionName(each.name)) {
            throw new Error(`No state function is named ${each.name}.`);
        }
        const version = toVersionNumber(each.version);
        return [each.name, version] as const;
    });
    return ImmutableMap(pairs);
}

/** The effects sub-root, persisted. */
export interface IPersistedEffectsRoot {
    readonly direct: {
        readonly records: readonly PersistedDirectEffect[];
        readonly values: IPersistedRunValues;
        /** The version of each state function in use, by name (FND-81). */
        readonly functionVersions: readonly IPersistedFunctionVersion[];
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
        case EffectKind.Input: {
            const reads = effect.reads.map(toPersistedRead);
            const response = { ...effect.response };
            if (isLocationSent(effect)) {
                const location = toPersistedCoordinates(effect.location);
                return { ...effect, at: effect.at.milliseconds, location, response, reads };
            }
            if (isLocationsSent(effect)) {
                const sends = effect.sends
                    .map((send) => ({
                        actor: send.actor,
                        location: toPersistedCoordinates(send.location),
                    }))
                    .toArray();
                return { ...effect, at: effect.at.milliseconds, sends, response, reads };
            }
            return { ...effect, at: effect.at.milliseconds, response, reads };
        }
        case EffectKind.Job: {
            const reads = effect.reads.map(toPersistedRead);
            return { ...effect, at: effect.at.milliseconds, reads };
        }
        case EffectKind.ConfigChange: {
            const before = toPersistedRunValues(effect.before);
            const after = toPersistedRunValues(effect.after);
            const { isScripted, followsFrom } = effect;
            const at = effect.at.milliseconds;
            return { kind: effect.kind, at, isScripted, before, after, followsFrom };
        }
        case EffectKind.ImplementationChange: {
            const before = toPersistedFunctionVersions(effect.before);
            const after = toPersistedFunctionVersions(effect.after);
            const { isScripted, followsFrom } = effect;
            const at = effect.at.milliseconds;
            return { kind: effect.kind, at, isScripted, before, after, followsFrom };
        }
        default:
            return unreachable(effect);
    }
}

/** An implementation change, from its persisted form. */
function fromPersistedImplementationChange(
    effect: IPersistedImplementationChangeEffect,
): IImplementationChangeEffect {
    const before = fromPersistedFunctionVersions(effect.before);
    const after = fromPersistedFunctionVersions(effect.after);
    const at = toSimTime(effect.at);
    const followsFrom = effect.followsFrom === null ? null : toCommitId(effect.followsFrom);
    const { isScripted } = effect;
    return { kind: effect.kind, at, isScripted, before, after, followsFrom };
}

/** The versions an effect read, found again in the state of the root that holds it. */
function readsIn(
    reads: readonly IPersistedVersionRead[],
    root: Pick<IMainRoot, 'state'>,
): readonly RecordVersion[] {
    const versions = reads.map((read) => fromPersistedRead(read, root));
    return Object.freeze(versions);
}

/** A direct effect, from its persisted form and the state of the root that holds it. */
export function fromPersistedDirectEffect(
    effect: PersistedDirectEffect,
    root: Pick<IMainRoot, 'state'>,
): DirectEffect {
    switch (effect.kind) {
        case EffectKind.Input:
            if (effect.command === InputCommand.SendLocations) {
                const sends = effect.sends.map((send): IAppSend => ({
                    actor: toInputActor(send.actor),
                    location: fromPersistedCoordinates(send.location),
                }));
                return {
                    ...effect,
                    at: toSimTime(effect.at),
                    sends: List(sends),
                    response: fromPersistedResponse(effect.response),
                    followsFrom: null,
                    reads: readsIn(effect.reads, root),
                };
            }
            if (effect.command === InputCommand.SendLocation) {
                return {
                    ...effect,
                    at: toSimTime(effect.at),
                    actor: toInputActor(effect.actor),
                    location: fromPersistedCoordinates(effect.location),
                    response: fromPersistedResponse(effect.response),
                    followsFrom: null,
                    reads: readsIn(effect.reads, root),
                };
            }
            return {
                ...effect,
                at: toSimTime(effect.at),
                actor: toInputActor(effect.actor),
                order: toInputOrderName(effect.order),
                response: fromPersistedResponse(effect.response),
                followsFrom: effect.followsFrom === null ? null : toCommitId(effect.followsFrom),
                isOnArrival: effect.isOnArrival ?? false,
                reads: readsIn(effect.reads, root),
            };
        case EffectKind.Job:
            return {
                ...effect,
                at: toSimTime(effect.at),
                stateCommits: toCount(effect.stateCommits),
                reads: readsIn(effect.reads, root),
            };
        case EffectKind.ConfigChange: {
            const before = fromPersistedRunValues(effect.before);
            const after = fromPersistedRunValues(effect.after);
            const at = toSimTime(effect.at);
            const followsFrom =
                effect.followsFrom === null ? null : toCommitId(effect.followsFrom);
            const { isScripted } = effect;
            return { kind: effect.kind, at, isScripted, before, after, followsFrom };
        }
        case EffectKind.ImplementationChange:
            return fromPersistedImplementationChange(effect);
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
        functionVersions: toPersistedFunctionVersions(effects.direct.functionVersions),
    },
    indirect: { records: effects.indirect.records.map(toPersistedIndirectEffect).toArray() },
    randomness: toPersistedRandomness(effects.randomness),
});

function fromPersistedEffects(
    effects: IPersistedEffectsRoot,
    root: Pick<IMainRoot, 'state'>,
): IEffectsRoot {
    const direct = effects.direct.records.map((effect) => fromPersistedDirectEffect(effect, root));
    const indirect = effects.indirect.records.map(fromPersistedIndirectEffect);
    return {
        direct: {
            records: List(direct),
            values: fromPersistedRunValues(effects.direct.values),
            functionVersions: fromPersistedFunctionVersions(effects.direct.functionVersions),
        },
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
export function fromPersistedMainRoot(root: IPersistedMainRoot): IMainRoot {
    const state = {
        orders: fromPersistedOrdersState(root.state.orders, toSimTime),
        drivers: fromPersistedDriversState(root.state.drivers, toSimTime),
        deliveries: fromPersistedDeliveriesState(root.state.deliveries, toSimTime),
    };
    const effects = fromPersistedEffects(root.effects, { state });
    return { state, effects };
}

/**
 * A main root's change from its parent's (FND-81): each module's state change, and the config
 * values, function versions, and randomness only when they changed, each part left out when it is
 * the parent's. The direct or indirect effect a commit adds is not here: its commit holds it.
 */
export interface IPersistedRootChange {
    readonly orders?: IPersistedOrdersChange | undefined;
    readonly drivers?: IPersistedDriversChange | undefined;
    readonly deliveries?: IPersistedDeliveriesChange | undefined;
    readonly values?: IPersistedRunValues | undefined;
    readonly functionVersions?: readonly IPersistedFunctionVersion[] | undefined;
    readonly randomness?: IPersistedRandomness | undefined;
}

/**
 * A main root's change from its parent's, the parent holding the commit's own effect already, so
 * the effect is not saved twice.
 */
export function toPersistedRootChange(parent: IMainRoot, child: IMainRoot): IPersistedRootChange {
    const before = parent.effects.direct;
    const after = child.effects.direct;
    return present({
        orders: toPersistedOrdersChange(parent.state.orders, child.state.orders),
        drivers: toPersistedDriversChange(parent.state.drivers, child.state.drivers),
        deliveries: toPersistedDeliveriesChange(parent.state.deliveries, child.state.deliveries),
        values: valueChange(before.values, after.values, toPersistedRunValues),
        functionVersions: valueChange(
            before.functionVersions,
            after.functionVersions,
            toPersistedFunctionVersions,
        ),
        randomness: valueChange(
            parent.effects.randomness,
            child.effects.randomness,
            toPersistedRandomness,
        ),
    });
}

/** The state sub-root a change leaves, the parent's own when no module changed. */
export function fromPersistedStateChange(
    parent: IStateRoot,
    change: IPersistedRootChange,
): IStateRoot {
    const orders = fromPersistedOrdersChange(parent.orders, change.orders, toSimTime);
    const drivers = fromPersistedDriversChange(parent.drivers, change.drivers, toSimTime);
    const deliveries = fromPersistedDeliveriesChange(
        parent.deliveries,
        change.deliveries,
        toSimTime,
    );
    const isSame =
        orders === parent.orders && drivers === parent.drivers && deliveries === parent.deliveries;
    return isSame ? parent : { orders, drivers, deliveries };
}

/**
 * The effects sub-root a change leaves, from the parent's with the commit's own effect added, and
 * that one itself when the change leaves the rest alone.
 */
export function fromPersistedEffectsChange(
    parent: IEffectsRoot,
    change: IPersistedRootChange,
): IEffectsRoot {
    const isSame =
        change.values === undefined &&
        change.functionVersions === undefined &&
        change.randomness === undefined;
    if (isSame) {
        return parent;
    }
    const { direct } = parent;
    return {
        ...parent,
        direct: {
            ...direct,
            values: appliedValueChange(direct.values, change.values, fromPersistedRunValues),
            functionVersions: appliedValueChange(
                direct.functionVersions,
                change.functionVersions,
                fromPersistedFunctionVersions,
            ),
        },
        randomness: appliedValueChange(
            parent.randomness,
            change.randomness,
            fromPersistedRandomness,
        ),
    };
}
