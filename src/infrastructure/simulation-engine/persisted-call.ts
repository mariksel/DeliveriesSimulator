import type { List } from 'immutable';

import type { JsonValue } from '../system/json/json-value';
import { required } from '../../domain/system/validation/required';
import { unreachable } from '../../domain/system/validation/unreachable';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import type { IStateCall } from '../../application-core/simulation-engine/state-call';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { DELIVERIES_FUNCTIONS } from '../drivers/deliveries/deliveries-functions';
import { DeliveryHandoff } from '../../domain/drivers/deliveries/delivery-handoff';
import type { IPersistedDeliveryHandoff } from '../drivers/deliveries/persisted-deliveries-state';
import type { IPersistedRestaurantPlace } from '../restaurants/persisted-restaurant-place';
import {
    fromPersistedDeliveryHandoff,
    toPersistedDeliveryHandoff,
} from '../drivers/deliveries/persisted-deliveries-state';
import {
    fromPersistedRestaurantPlace,
    toPersistedRestaurantPlace,
} from '../restaurants/persisted-restaurant-place';
import { isJsonData } from '../system/json/json-data';
import { ORDERS_FUNCTIONS } from '../orders/orders-functions';
import type { IRegisteredFunction } from '../system/functions/registered-function';
import { ArgumentKind } from '../system/functions/registered-function';
import type { ICallOrders, OrdersDecidedEvent } from '../../domain/drivers/deliveries/call-orders';
import { FollowUpKind } from '../../domain/drivers/deliveries/follow-up-kind';
import { toDriverId } from '../../domain/drivers/driver';
import { toOrderId } from '../../domain/orders/order';
import { SimTime, toSimTime } from '../../domain/simulation-engine/sim-time';

/** Every function a state commit can hold, with its stored ID. */
export const STATE_FUNCTIONS: List<IRegisteredFunction> =
    ORDERS_FUNCTIONS.concat(DELIVERIES_FUNCTIONS);

/** An argument persisted as plain data. */
export interface IPersistedValueArgument {
    readonly kind: typeof ArgumentKind.Value;
    readonly value: JsonValue;
}

/** A restaurant's place passed in, persisted through its own mapping. */
export interface IPersistedRestaurantPlaceArgument {
    readonly kind: typeof ArgumentKind.RestaurantPlace;
    readonly place: IPersistedRestaurantPlace;
}

/** A handoff passed in, persisted through its own mapping. */
export interface IPersistedDeliveryHandoffArgument {
    readonly kind: typeof ArgumentKind.DeliveryHandoff;
    readonly handoff: IPersistedDeliveryHandoff;
}

/** A moment passed in, persisted as its milliseconds. */
export interface IPersistedInstantArgument {
    readonly kind: typeof ArgumentKind.Instant;
    readonly at: number;
}

/** The call to orders a driver's command asked for, persisted with its moment as milliseconds. */
export interface IPersistedCallOrdersArgument {
    readonly kind: typeof ArgumentKind.CallOrders;
    readonly at: number;
    readonly orderId: string;
    readonly driverId: string;
    readonly eventKind: OrdersDecidedEvent;
}

/** An argument that holds a moment. */
export type PersistedTimedArgument = IPersistedInstantArgument | IPersistedCallOrdersArgument;

/** A Domain instance passed in, persisted through the mapping of its class. */
export type PersistedRecordArgument =
    IPersistedRestaurantPlaceArgument | IPersistedDeliveryHandoffArgument;

/** An argument persisted as one event of an outbox in the parent root, found by its ID. */
export interface IPersistedOutboxEventArgument {
    readonly kind:
        typeof ArgumentKind.OrdersOutboxEvent | typeof ArgumentKind.DeliveriesOutboxEvent;
    readonly id: string;
}

/** An argument persisted as a part of the parent root: an outbox, or config values. */
export interface IPersistedPlaceArgument {
    readonly kind:
        | typeof ArgumentKind.OrdersOutbox
        | typeof ArgumentKind.DeliveriesOutbox
        | typeof ArgumentKind.OrdersRules
        | typeof ArgumentKind.DeliveriesRules
        | typeof ArgumentKind.DriversRules
        | typeof ArgumentKind.DriversState;
}

/** One of a state commit's arguments, persisted. */
export type PersistedArgument =
    | IPersistedValueArgument
    | PersistedTimedArgument
    | PersistedRecordArgument
    | IPersistedOutboxEventArgument
    | IPersistedPlaceArgument;

/** The function a state commit ran, by its stored ID, and its arguments, persisted. */
export interface IPersistedCall {
    readonly functionId: string;
    readonly args: readonly PersistedArgument[];
}

function assertSame(value: unknown, expected: unknown, kind: ArgumentKind): void {
    if (value !== expected) {
        throw new Error(`A ${kind} argument must be the parent root's own.`);
    }
}

function outboxEventId(value: unknown, outbox: List<{ readonly id: string }>): string {
    const event = outbox.find((candidate) => candidate === value);
    return required(event, "an event of the parent root's outbox").id;
}

function plainData(value: unknown): JsonValue {
    if (!isJsonData(value)) {
        throw new Error('A Value argument must be plain data.');
    }
    return value;
}

/** A Domain instance passed in, persisted through its class's mapping, once its class is known. */
function toPersistedRecordArgument(
    kind: PersistedRecordArgument['kind'],
    value: unknown,
): PersistedRecordArgument {
    if (kind === ArgumentKind.RestaurantPlace) {
        if (!(value instanceof RestaurantPlace)) {
            throw new Error('A RestaurantPlace argument must be a restaurant place.');
        }
        return { kind, place: toPersistedRestaurantPlace(value) };
    }
    if (!(value instanceof DeliveryHandoff)) {
        throw new Error('A DeliveryHandoff argument must be a handoff.');
    }
    return { kind, handoff: toPersistedDeliveryHandoff(value) };
}

const PLACE_KINDS: readonly ArgumentKind[] = [
    ArgumentKind.OrdersOutbox,
    ArgumentKind.DeliveriesOutbox,
    ArgumentKind.OrdersRules,
    ArgumentKind.DeliveriesRules,
    ArgumentKind.DriversRules,
    ArgumentKind.DriversState,
];

/** Whether an argument names a part of the parent root rather than holding its own data. */
const isPlace = (kind: ArgumentKind): kind is IPersistedPlaceArgument['kind'] =>
    PLACE_KINDS.includes(kind);

/** Whether a persisted argument names a part of the parent root. */
const isPlaceArgument = (argument: PersistedArgument): argument is IPersistedPlaceArgument =>
    isPlace(argument.kind);

/** The part of the parent root that a place argument names. */
function placeOf(kind: IPersistedPlaceArgument['kind'], parent: IMainRoot): unknown {
    const { orders, drivers, deliveries } = parent.state;
    const { values } = parent.effects.direct;
    switch (kind) {
        case ArgumentKind.OrdersOutbox:
            return orders.outbox;
        case ArgumentKind.DeliveriesOutbox:
            return deliveries.outbox;
        case ArgumentKind.OrdersRules:
            return values.orders;
        case ArgumentKind.DeliveriesRules:
            return values.deliveries;
        case ArgumentKind.DriversRules:
            return values.drivers;
        case ArgumentKind.DriversState:
            return drivers;
        default:
            return unreachable(kind);
    }
}

const isTimed = (kind: ArgumentKind): kind is PersistedTimedArgument['kind'] =>
    kind === ArgumentKind.Instant || kind === ArgumentKind.CallOrders;

const isTimedArgument = (argument: PersistedArgument): argument is PersistedTimedArgument =>
    isTimed(argument.kind);

function simulatedTimeOf(value: unknown): SimTime {
    if (!(value instanceof SimTime)) {
        throw new Error('An IInstant argument must be a simulated time.');
    }
    return value;
}

function isCallOrders(value: unknown): value is ICallOrders {
    return (
        typeof value === 'object' &&
        value !== null &&
        'kind' in value &&
        value.kind === FollowUpKind.CallOrders
    );
}

/** A moment, or the call to orders that holds one, persisted with its moment as milliseconds. */
function toPersistedTimedArgument(
    kind: PersistedTimedArgument['kind'],
    value: unknown,
): PersistedTimedArgument {
    if (kind === ArgumentKind.Instant) {
        return { kind, at: simulatedTimeOf(value).milliseconds };
    }
    if (!isCallOrders(value)) {
        throw new Error('A CallOrders argument must be a call to orders.');
    }
    const at = simulatedTimeOf(value.at).milliseconds;
    const { orderId, driverId, eventKind } = value;
    return { kind, at, orderId, driverId, eventKind };
}

function fromPersistedTimedArgument(argument: PersistedTimedArgument): SimTime | ICallOrders {
    const at = toSimTime(argument.at);
    if (argument.kind === ArgumentKind.Instant) {
        return at;
    }
    return {
        kind: FollowUpKind.CallOrders,
        at,
        orderId: toOrderId(argument.orderId),
        driverId: toDriverId(argument.driverId),
        eventKind: argument.eventKind,
    };
}

function toPersistedArgument(
    kind: ArgumentKind,
    value: unknown,
    parent: IMainRoot,
): PersistedArgument {
    if (isTimed(kind)) {
        return toPersistedTimedArgument(kind, value);
    }
    if (isPlace(kind)) {
        const place = placeOf(kind, parent);
        assertSame(value, place, kind);
        return { kind };
    }
    const { orders, deliveries } = parent.state;
    switch (kind) {
        case ArgumentKind.Value:
            return { kind, value: plainData(value) };
        case ArgumentKind.RestaurantPlace:
        case ArgumentKind.DeliveryHandoff:
            return toPersistedRecordArgument(kind, value);
        case ArgumentKind.OrdersOutboxEvent:
            return { kind, id: outboxEventId(value, orders.outbox) };
        case ArgumentKind.DeliveriesOutboxEvent:
            return { kind, id: outboxEventId(value, deliveries.outbox) };
        default:
            return unreachable(kind);
    }
}

function eventOf<TEvent extends { readonly id: string }>(
    outbox: List<TEvent>,
    id: string,
): TEvent {
    const event = outbox.find((candidate) => candidate.id === id);
    return required(event, `outbox event ${id} in the parent root`);
}

function fromPersistedArgument(argument: PersistedArgument, parent: IMainRoot): unknown {
    if (isTimedArgument(argument)) {
        return fromPersistedTimedArgument(argument);
    }
    if (isPlaceArgument(argument)) {
        return placeOf(argument.kind, parent);
    }
    const { orders, deliveries } = parent.state;
    switch (argument.kind) {
        case ArgumentKind.Value:
            return argument.value;
        case ArgumentKind.RestaurantPlace:
            return fromPersistedRestaurantPlace(argument.place);
        case ArgumentKind.DeliveryHandoff:
            return fromPersistedDeliveryHandoff(argument.handoff);
        case ArgumentKind.OrdersOutboxEvent:
            return eventOf(orders.outbox, argument.id);
        case ArgumentKind.DeliveriesOutboxEvent:
            return eventOf(deliveries.outbox, argument.id);
        default:
            return unreachable(argument);
    }
}

/** The registered function a state commit holds, found by reference. */
export function registeredFunctionOf(call: IStateCall): IRegisteredFunction {
    const registered = STATE_FUNCTIONS.find((entry) => entry.fn === call.fn);
    if (registered === undefined) {
        throw new Error(`The state function ${call.fn.name} has no stored ID.`);
    }
    return registered;
}

/**
 * A state commit's call, persisted: the function by its stored ID, and each argument as plain
 * data or as where to find it in the parent root.
 */
export function toPersistedCall(call: IStateCall, parent: IMainRoot): IPersistedCall {
    const registered = registeredFunctionOf(call);
    if (call.args.length !== registered.args.length) {
        throw new Error(`${registered.id} takes ${registered.args.length} arguments.`);
    }
    const args = registered.args.map((kind, index) =>
        toPersistedArgument(kind, call.args[index], parent),
    );
    return { functionId: registered.id, args };
}

/** A state commit's call, from its persisted form and the commit's parent root. */
export function fromPersistedCall(call: IPersistedCall, parent: IMainRoot): IStateCall {
    const registered = STATE_FUNCTIONS.find((entry) => entry.id === call.functionId);
    if (registered === undefined) {
        throw new Error(`No state function has the stored ID ${call.functionId}.`);
    }
    const args = call.args.map((argument) => fromPersistedArgument(argument, parent));
    return { fn: registered.fn, args };
}
