import type { OrderId } from '../../domain/orders/order';
import type { CommitId } from './commit-id';
import type { InputActor, InputOrderName } from './run-input';
import type { CommandRefusal } from './command-outcome';
import type { RunJob } from './run-work';
import type { IRunValues } from './run-values';
import type { OrderCommand } from './input-command';
import { InputCommand } from './input-command';
import type { List } from 'immutable';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import type { Count } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { RecordVersion } from './record-version';
import type { FunctionVersions } from './function-lookup';

/** The kinds of effect the service takes part in. */
export const EffectKind = {
    Input: 'Input',
    Job: 'Job',
    ConfigChange: 'ConfigChange',
    ImplementationChange: 'ImplementationChange',
} as const;

/** One of the values of {@link EffectKind}. */
export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind];

/** What a consumer's call got back: the order a create order call made, or the refusal. */
export type InputResponse =
    | { readonly isOk: true; readonly orderId: OrderId | null }
    | { readonly isOk: false; readonly refusal: CommandRefusal };

/** A consumer's call to the service: who called, the request, and the response they got. */
export interface IInputEffect {
    readonly kind: typeof EffectKind.Input;
    readonly at: SimTime;
    readonly actor: InputActor;
    readonly command: OrderCommand;
    readonly order: InputOrderName;
    readonly response: InputResponse;
    /** The indirect commit that led to the call, when that is known, or null (FND-89). */
    readonly followsFrom: CommitId | null;
    /**
     * Whether it is a scripted pick-up or delivery made when its driver arrived, after the step
     * said so in the indirect commit it follows from (FND-90). It is not a step run itself.
     */
    readonly isOnArrival: boolean;
    /** The record versions it read, as they stood before it (FND-81). */
    readonly reads: readonly RecordVersion[];
}

/**
 * The service's call to an external service, such as the push or routing provider: one of a set
 * of kinds, each with its own typed data. The set starts empty, and the item that first calls a
 * provider adds its kind, and adds {@link OutputEffect} to {@link DirectEffect}.
 */
export type OutputEffect = never;

/**
 * A background job's run, recorded even when it finds nothing, as its record can be seen from
 * outside.
 */
export interface IJobEffect {
    readonly kind: typeof EffectKind.Job;
    readonly at: SimTime;
    readonly job: RunJob;
    /** How many state commits it made. */
    readonly stateCommits: Count;
    /** The record versions it read, as they stood before it (FND-81). */
    readonly reads: readonly RecordVersion[];
}

/** A config value tuned during a run: the values in use before, and the ones in use after. */
export interface IConfigChangeEffect {
    readonly kind: typeof EffectKind.ConfigChange;
    readonly at: SimTime;
    /** Whether a step of the run's script made it, so that it counts as a step run. */
    readonly isScripted: boolean;
    readonly before: IRunValues;
    readonly after: IRunValues;
    /** The indirect commit that led to the change, when that is known, or null (FND-89). */
    readonly followsFrom: CommitId | null;
}

/**
 * State functions switched to other versions during a run: the version of each in use before,
 * and after (FND-81).
 */
export interface IImplementationChangeEffect {
    readonly kind: typeof EffectKind.ImplementationChange;
    readonly at: SimTime;
    /** Whether a step of the run's script made it, so that it counts as a step run. */
    readonly isScripted: boolean;
    readonly before: FunctionVersions;
    readonly after: FunctionVersions;
    /** The indirect commit that led to the switch, when that is known, or null (FND-89). */
    readonly followsFrom: CommitId | null;
}

/** What crossed the service's boundary, with the service taking part. */
/**
 * A driver's app sending its location to the service by itself, every interval while the driver
 * is online: an input call about no order, which no step gives (FND-90).
 */
export interface ILocationSentEffect {
    readonly kind: typeof EffectKind.Input;
    readonly at: SimTime;
    /** The driver whose app sent it. */
    readonly actor: InputActor;
    readonly command: typeof InputCommand.SendLocation;
    readonly location: Coordinates;
    readonly response: InputResponse;
    /** Always null: no indirect commit leads to an app's own send. */
    readonly followsFrom: null;
    /** The record versions it read, as they stood before it (FND-81). */
    readonly reads: readonly RecordVersion[];
}

/** One app's send among those due at one moment: whose app sent it, and where (FND-90). */
export interface IAppSend {
    readonly actor: InputActor;
    readonly location: Coordinates;
}

/**
 * Every driver's app due at one moment sending its location, as one input call about no order,
 * which no step gives: a day makes one every interval, whatever the number of drivers (FND-90).
 */
export interface ILocationsSentEffect {
    readonly kind: typeof EffectKind.Input;
    readonly at: SimTime;
    readonly command: typeof InputCommand.SendLocations;
    /** Each app's send, in the order of the drivers in the script. */
    readonly sends: List<IAppSend>;
    readonly response: InputResponse;
    /** Always null: no indirect commit leads to the apps' own sends. */
    readonly followsFrom: null;
    /** The record versions it read, as they stood before it (FND-81). */
    readonly reads: readonly RecordVersion[];
}

/** A consumer's call to the service: about an order, or drivers' apps sending their locations. */
export type InputEffect = IInputEffect | ILocationSentEffect | ILocationsSentEffect;

/** An effect the service takes part in directly: a call, a job's run, or a change to it. */
export type DirectEffect =
    InputEffect | IJobEffect | IConfigChangeEffect | IImplementationChangeEffect;

/** Whether an effect is a driver's app sending its location alone, as before batching (FND-90). */
export const isLocationSent = (effect: DirectEffect): effect is ILocationSentEffect =>
    effect.kind === EffectKind.Input && effect.command === InputCommand.SendLocation;

/** Whether an effect is the apps due at one moment sending their locations (FND-90). */
export const isLocationsSent = (effect: DirectEffect): effect is ILocationsSentEffect =>
    effect.kind === EffectKind.Input && effect.command === InputCommand.SendLocations;

/** Whether an effect is apps sending locations: one alone, as before batching, or a batch. */
export const isAppSends = (
    effect: DirectEffect,
): effect is ILocationSentEffect | ILocationsSentEffect =>
    isLocationSent(effect) || isLocationsSent(effect);
