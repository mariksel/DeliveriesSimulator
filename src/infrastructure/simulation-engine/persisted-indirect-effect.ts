import type {
    IndirectEffect,
    IndirectStatement,
} from '../../application-core/simulation-engine/indirect-effect';
import {
    IndirectKind,
    isStatedIndirect,
} from '../../application-core/simulation-engine/indirect-effect';
import type { RideStatement } from '../../application-core/simulation-engine/ride';
import { RideKind } from '../../application-core/simulation-engine/ride';
import type { OrderCommand } from '../../application-core/simulation-engine/input-command';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toOrderId } from '../../domain/orders/order';
import { List } from 'immutable';
import type { IPersistedCoordinates } from '../map-and-routing/persisted-coordinates';
import {
    fromPersistedCoordinates,
    toPersistedCoordinates,
} from '../map-and-routing/persisted-coordinates';
import {
    toIndirectLabel,
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toDuration } from '../../domain/system/time/duration';
import { unreachable } from '../../domain/system/validation/unreachable';

/** What every persisted statement has: the order, and its label, if any. */
interface IPersistedStatedAbout {
    readonly order: string;
    readonly label: string | null;
}

/** A driver ignoring a request, persisted. */
export interface IPersistedDriverIgnoresRequest extends IPersistedStatedAbout {
    readonly kind: typeof IndirectKind.DriverIgnoresRequest;
    readonly actor: string;
}

/** A restaurant running late, persisted with how much later as milliseconds. */
export interface IPersistedRestaurantRunsLate extends IPersistedStatedAbout {
    readonly kind: typeof IndirectKind.RestaurantRunsLate;
    readonly actor: string;
    readonly lateBy: number;
}

/** A customer not taking an order, persisted. */
export interface IPersistedCustomerWontTakeOrder extends IPersistedStatedAbout {
    readonly kind: typeof IndirectKind.CustomerWontTakeOrder;
}

/** An indirect statement, persisted, each kind in its own form. */
export type PersistedIndirectStatement =
    | IPersistedDriverIgnoresRequest
    | IPersistedRestaurantRunsLate
    | IPersistedCustomerWontTakeOrder;

/** A driver setting off for a stop, persisted, with its route's points (FND-90). */
export interface IPersistedDriverSetsOff {
    readonly kind: typeof RideKind.SetsOff;
    readonly actor: string;
    readonly stopOrder: string;
    readonly isPickUp: boolean;
    readonly path: readonly IPersistedCoordinates[];
    readonly metres: number;
    readonly speedKmh: number;
    readonly label: null;
}

/** A scripted pick-up or delivery waiting for its driver, persisted (FND-90). */
export interface IPersistedDriverActsOnArrival {
    readonly kind: typeof RideKind.ActsOnArrival;
    readonly actor: string;
    readonly command: OrderCommand;
    readonly order: string;
    readonly label: null;
}

/** A driver going to wait at their area's waiting point, persisted, with its route (FND-90). */
export interface IPersistedDriverGoesToWait {
    readonly kind: typeof RideKind.GoesToWait;
    readonly actor: string;
    readonly areaId: string;
    readonly path: readonly IPersistedCoordinates[];
    readonly metres: number;
    readonly speedKmh: number;
    readonly label: null;
}

/** A riding driver's decision, persisted. */
export type PersistedRideStatement =
    IPersistedDriverSetsOff | IPersistedDriverActsOnArrival | IPersistedDriverGoesToWait;

/** An indirect effect, persisted: its statement, with its moment as milliseconds. */
export type PersistedIndirectEffect = (PersistedIndirectStatement | PersistedRideStatement) & {
    readonly at: number;
    readonly isScripted: boolean;
};

/** A riding driver's decision, persisted. */
function toPersistedRideStatement(statement: RideStatement): PersistedRideStatement {
    if (statement.kind === RideKind.ActsOnArrival) {
        return { ...statement };
    }
    const path = statement.path.map(toPersistedCoordinates).toArray();
    return { ...statement, path };
}

/** A riding driver's decision, from its persisted form. */
function fromPersistedRideStatement(statement: PersistedRideStatement): RideStatement {
    const actor = toInputActor(statement.actor);
    if (statement.kind === RideKind.ActsOnArrival) {
        const order = toInputOrderName(statement.order);
        return { ...statement, actor, order };
    }
    const points = statement.path.map(fromPersistedCoordinates);
    const path = List(points);
    if (statement.kind === RideKind.GoesToWait) {
        const areaId = toAreaId(statement.areaId);
        return { ...statement, actor, areaId, path };
    }
    const stopOrder = toOrderId(statement.stopOrder);
    return { ...statement, actor, stopOrder, path };
}

const isPersistedRide = (
    effect: PersistedIndirectEffect,
): effect is PersistedRideStatement & PersistedIndirectEffect =>
    effect.kind === RideKind.SetsOff ||
    effect.kind === RideKind.ActsOnArrival ||
    effect.kind === RideKind.GoesToWait;

/** An indirect statement, persisted. */
export function toPersistedIndirectStatement(
    statement: IndirectStatement,
): PersistedIndirectStatement {
    const { order, label } = statement;
    switch (statement.kind) {
        case IndirectKind.DriverIgnoresRequest:
            return { kind: statement.kind, order, label, actor: statement.actor };
        case IndirectKind.RestaurantRunsLate: {
            const lateBy = statement.lateBy.milliseconds;
            return { kind: statement.kind, order, label, actor: statement.actor, lateBy };
        }
        case IndirectKind.CustomerWontTakeOrder:
            return { kind: statement.kind, order, label };
        default:
            return unreachable(statement);
    }
}

/** An indirect statement, from its persisted form. */
export function fromPersistedIndirectStatement(
    statement: PersistedIndirectStatement,
): IndirectStatement {
    const order = toInputOrderName(statement.order);
    const label = statement.label === null ? null : toIndirectLabel(statement.label);
    switch (statement.kind) {
        case IndirectKind.DriverIgnoresRequest: {
            const actor = toInputActor(statement.actor);
            return { kind: statement.kind, order, label, actor };
        }
        case IndirectKind.RestaurantRunsLate: {
            const actor = toInputActor(statement.actor);
            const lateBy = toDuration(statement.lateBy);
            return { kind: statement.kind, order, label, actor, lateBy };
        }
        case IndirectKind.CustomerWontTakeOrder:
            return { kind: statement.kind, order, label };
        default:
            return unreachable(statement);
    }
}

/** An indirect effect, persisted. */
export function toPersistedIndirectEffect(effect: IndirectEffect): PersistedIndirectEffect {
    const statement = isStatedIndirect(effect)
        ? toPersistedIndirectStatement(effect)
        : toPersistedRideStatement(effect);
    return { ...statement, at: effect.at.milliseconds, isScripted: effect.isScripted };
}

/** An indirect effect, from its persisted form. */
export function fromPersistedIndirectEffect(effect: PersistedIndirectEffect): IndirectEffect {
    const statement = isPersistedRide(effect)
        ? fromPersistedRideStatement(effect)
        : fromPersistedIndirectStatement(effect);
    const at = toSimTime(effect.at);
    return { ...statement, at, isScripted: effect.isScripted };
}
