import type { OrderId } from '../../domain/orders/order';
import type { CommitId } from './commit-id';
import type { InputActor, InputOrderName } from './run-input';
import type { CommandRefusal } from './command-outcome';
import type { RunJob } from './run-work';
import type { IRunValues } from './run-values';
import type { InputCommand } from './input-command';
import type { Count } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';

/** The kinds of effect the service takes part in. */
export const EffectKind = {
    Input: 'Input',
    Job: 'Job',
    ConfigChange: 'ConfigChange',
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
    readonly command: InputCommand;
    readonly order: InputOrderName;
    readonly response: InputResponse;
    /** The indirect commit that led to the call, when that is known, or null (FND-89). */
    readonly followsFrom: CommitId | null;
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
}

/** A config value tuned during a run: the values in use before, and the ones in use after. */
export interface IConfigChangeEffect {
    readonly kind: typeof EffectKind.ConfigChange;
    readonly at: SimTime;
    /** Whether a step of the run's script made it, so that it counts as a step run. */
    readonly isScripted: boolean;
    readonly before: IRunValues;
    readonly after: IRunValues;
}

/** What crossed the service's boundary, with the service taking part. */
export type DirectEffect = IInputEffect | IJobEffect | IConfigChangeEffect;
