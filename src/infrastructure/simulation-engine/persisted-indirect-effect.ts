import type {
    IndirectEffect,
    IndirectStatement,
} from '../../application-core/simulation-engine/indirect-effect';
import { IndirectKind } from '../../application-core/simulation-engine/indirect-effect';
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

/** An indirect effect, persisted: its statement, with its moment as milliseconds. */
export type PersistedIndirectEffect = PersistedIndirectStatement & {
    readonly at: number;
    readonly isScripted: boolean;
};

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
    const statement = toPersistedIndirectStatement(effect);
    return { ...statement, at: effect.at.milliseconds, isScripted: effect.isScripted };
}

/** An indirect effect, from its persisted form. */
export function fromPersistedIndirectEffect(effect: PersistedIndirectEffect): IndirectEffect {
    const statement = fromPersistedIndirectStatement(effect);
    const at = toSimTime(effect.at);
    return { ...statement, at, isScripted: effect.isScripted };
}
