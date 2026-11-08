import { recordPart } from '../../domain/system/digests/digest-parts';
import type { Duration } from '../../domain/system/time/duration';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { IndirectLabel, InputActor, InputOrderName } from './input-names';

/** The kinds of decision or change outside the service, which it takes no part in (FND-89). */
export const IndirectKind = {
    DriverIgnoresRequest: 'driver-ignores-request',
    RestaurantRunsLate: 'restaurant-runs-late',
    CustomerWontTakeOrder: 'customer-wont-take-order',
} as const;

/** One of the values of {@link IndirectKind}. */
export type IndirectKind = (typeof IndirectKind)[keyof typeof IndirectKind];

/** What every kind states: the order, and the name an input gave it, if any. */
interface IStatedAbout {
    readonly order: InputOrderName;
    readonly label: IndirectLabel | null;
}

/** A driver decides to ignore the request to deliver an order, without telling the service. */
export interface IDriverIgnoresRequest extends IStatedAbout {
    readonly kind: typeof IndirectKind.DriverIgnoresRequest;
    readonly actor: InputActor;
}

/** A restaurant falls behind with an order, and expects it to be ready this much later. */
export interface IRestaurantRunsLate extends IStatedAbout {
    readonly kind: typeof IndirectKind.RestaurantRunsLate;
    readonly actor: InputActor;
    readonly lateBy: Duration;
}

/** The customer decides not to take an order. */
export interface ICustomerWontTakeOrder extends IStatedAbout {
    readonly kind: typeof IndirectKind.CustomerWontTakeOrder;
}

/**
 * A decision or change outside the service, as stated: one of a set of kinds, each with its own
 * typed data (FND-72, FND-89).
 */
export type IndirectStatement =
    IDriverIgnoresRequest | IRestaurantRunsLate | ICustomerWontTakeOrder;

/** When an indirect effect happened, and whether a step of the run's script stated it. */
export interface IIndirectMoment {
    readonly at: SimTime;
    /** Whether a step of the run's script stated it, so that it counts as a step run. */
    readonly isScripted: boolean;
}

/** One decision or change outside the service, in the order it happened. */
export type IndirectEffect = IndirectStatement & IIndirectMoment;

/** The actor who decided, or null for a kind with none. */
const actorOf = (effect: IndirectEffect): InputActor | null =>
    'actor' in effect ? effect.actor : null;

/** How much later, in milliseconds, or null for a kind with no delay. */
const lateByOf = (effect: IndirectEffect): number | null =>
    'lateBy' in effect ? effect.lateBy.milliseconds : null;

/**
 * An indirect effect, written out field by field for the run digest: the fields every kind has,
 * then the ones only some kinds have, which are null for the rest.
 */
export function indirectEffectPart(effect: IndirectEffect): string {
    const time = effect.at.digestPart();
    const actor = actorOf(effect);
    const lateBy = lateByOf(effect);
    return recordPart([
        { text: effect.kind },
        { part: time },
        { isTrue: effect.isScripted },
        { textOrNull: effect.label },
        { text: effect.order },
        { textOrNull: actor },
        { numberOrNull: lateBy },
    ]);
}

/** Whether two indirect effects are the same, field by field. */
export function indirectEffectsEqual(first: IndirectEffect, second: IndirectEffect): boolean {
    const firstPart = indirectEffectPart(first);
    const secondPart = indirectEffectPart(second);
    return firstPart === secondPart;
}
