import { List, OrderedMap } from 'immutable';

import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { OrderId } from '../../domain/orders/order';
import { toDeliveryEventId } from '../../domain/drivers/deliveries/delivery-event-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toOrderDeliveryId } from '../../domain/drivers/deliveries/order-delivery';
import { toOrderEventId } from '../../domain/orders/order-event-id';
import { toOrderId } from '../../domain/orders/order';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import type { DeliveryEventKind } from '../../domain/drivers/deliveries/delivery-event-kind';
import { DeliveriesEventCopy } from '../../domain/orders/deliveries-event-copy';
import { DeliveryCopy, DeliveryCopyVersion } from '../../domain/orders/delivery-copy';
import { Order, OrderVersion } from '../../domain/orders/order';
import type { OrderEventKind } from '../../domain/orders/order-event-kind';
import { OrderEventRecord } from '../../domain/orders/order-event-record';
import type { OrderStatus } from '../../domain/orders/order-status';
import { OrdersOutboxEvent } from '../../domain/orders/orders-outbox-event';
import { OrdersState } from '../../domain/orders/orders-state';
import type { IPersistedRestaurantPlace } from '../restaurants/persisted-restaurant-place';
import {
    fromPersistedRestaurantPlace,
    toPersistedRestaurantPlace,
} from '../restaurants/persisted-restaurant-place';
import type { IPersistedGroup } from '../system/records/persisted-groups';
import {
    fromPersistedGroups,
    fromPersistedRecords,
    toPersistedGroups,
    toPersistedRecords,
} from '../system/records/persisted-groups';
import type {
    IPersistedInboxPosition,
    IPersistedInboxRecord,
} from '../system/messaging/persisted-inbox';
import {
    fromPersistedInbox,
    fromPersistedInboxPosition,
    toPersistedInbox,
    toPersistedInboxPosition,
} from '../system/messaging/persisted-inbox';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { toCount } from '../../domain/system/math/math';
import type { InstantAt } from '../../domain/system/time/instant';
import { toOrdersOutboxEventId } from '../../domain/orders/orders-outbox-event';
import { toDeliveriesOutboxEventId } from '../../domain/drivers/deliveries/deliveries-outbox-event';

/** The part of an order that never changes, persisted. */
export interface IPersistedOrder {
    readonly id: string;
    readonly restaurantId: string;
}

/** An order's version, persisted with the versions before it. */
export interface IPersistedOrderVersion {
    readonly number: number;
    readonly previous: IPersistedOrderVersion | null;
    readonly orderId: string;
    readonly status: OrderStatus;
    readonly isDeliveryRequestPending: boolean;
    readonly isReady: boolean;
    readonly driverId: string | null;
}

/** The restaurant an order is from, persisted with the order it belongs to. */
export interface IPersistedOrderRestaurant {
    readonly orderId: string;
    readonly restaurant: IPersistedRestaurantPlace;
}

/** An orders event, persisted. */
export interface IPersistedOrderEventRecord {
    readonly id: string;
    readonly orderId: string;
    readonly kind: OrderEventKind;
    readonly at: number;
    readonly driverId: string | null;
    readonly deliveriesEventId: string | null;
}

/** An orders outbox event, persisted. */
export interface IPersistedOrdersOutboxEvent {
    readonly id: string;
    readonly eventId: string;
    readonly orderId: string;
    readonly kind: OrderEventKind;
    readonly at: number;
    readonly driverId: string | null;
    readonly orderVersion: number;
    readonly orderStatus: OrderStatus;
    readonly startedEventId: string | null;
}

/** The copy orders keeps of an event it read from the deliveries outbox, persisted. */
export interface IPersistedDeliveriesEventCopy {
    readonly id: string;
    readonly eventId: string;
    readonly orderId: string;
    readonly kind: DeliveryEventKind;
    readonly at: number;
    readonly driverId: string | null;
    readonly wasStartedByDeliveries: boolean;
}

/** The part of orders' copy of a delivery that never changes, persisted. */
export interface IPersistedDeliveryCopy {
    readonly orderId: string;
    readonly orderDeliveryId: string;
}

/** A version of orders' copy of a delivery, persisted with the versions before it. */
export interface IPersistedDeliveryCopyVersion {
    readonly number: number;
    readonly previous: IPersistedDeliveryCopyVersion | null;
    readonly orderId: string;
    readonly events: readonly IPersistedDeliveriesEventCopy[];
}

/** The orders module's state, persisted. */
export interface IPersistedOrdersState {
    readonly orders: readonly IPersistedOrder[];
    readonly orderVersions: readonly IPersistedOrderVersion[];
    readonly restaurants: readonly IPersistedOrderRestaurant[];
    readonly eventsByOrder: readonly IPersistedGroup<IPersistedOrderEventRecord>[];
    readonly outbox: readonly IPersistedOrdersOutboxEvent[];
    readonly inbox: readonly IPersistedInboxRecord[];
    readonly inboxPosition: IPersistedInboxPosition;
    readonly copies: readonly IPersistedDeliveryCopy[];
    readonly copyVersions: readonly IPersistedDeliveryCopyVersion[];
    readonly nextOrder: number;
}

const toPersistedOrder = (order: Order): IPersistedOrder => ({
    id: order.id,
    restaurantId: order.restaurantId,
});

const fromPersistedOrder = (order: IPersistedOrder): Order =>
    Order.create({ id: toOrderId(order.id), restaurantId: toRestaurantId(order.restaurantId) });

const toPersistedOrderVersion = (version: OrderVersion): IPersistedOrderVersion => ({
    number: version.number,
    previous: version.previous === null ? null : toPersistedOrderVersion(version.previous),
    orderId: version.orderId,
    status: version.status,
    isDeliveryRequestPending: version.isDeliveryRequestPending,
    isReady: version.isReady,
    driverId: version.driverId,
});

const fromPersistedOrderVersion = (version: IPersistedOrderVersion): OrderVersion =>
    OrderVersion.create({
        orderId: toOrderId(version.orderId),
        status: version.status,
        isDeliveryRequestPending: version.isDeliveryRequestPending,
        isReady: version.isReady,
        driverId: version.driverId === null ? null : toDriverId(version.driverId),
        number: toVersionNumber(version.number),
        previous: version.previous === null ? null : fromPersistedOrderVersion(version.previous),
    });

/** An orders event, persisted. */
export const toPersistedOrderEvent = (event: OrderEventRecord): IPersistedOrderEventRecord => ({
    id: event.id,
    orderId: event.orderId,
    kind: event.kind,
    at: event.at.sinceStart.milliseconds,
    driverId: event.driverId,
    deliveriesEventId: event.deliveriesEventId,
});

/** An orders event, from its persisted form. */
export const fromPersistedOrderEvent = (
    event: IPersistedOrderEventRecord,
    instantAt: InstantAt,
): OrderEventRecord =>
    OrderEventRecord.create({
        id: toOrderEventId(event.id),
        orderId: toOrderId(event.orderId),
        kind: event.kind,
        at: instantAt(event.at),
        driverId: event.driverId === null ? null : toDriverId(event.driverId),
        deliveriesEventId:
            event.deliveriesEventId === null ? null : toDeliveryEventId(event.deliveriesEventId),
    });

/** An orders outbox event, persisted. */
export const toPersistedOrdersOutboxEvent = (
    event: OrdersOutboxEvent,
): IPersistedOrdersOutboxEvent => ({
    id: event.id,
    eventId: event.eventId,
    orderId: event.orderId,
    kind: event.kind,
    at: event.at.sinceStart.milliseconds,
    driverId: event.driverId,
    orderVersion: event.orderVersion,
    orderStatus: event.orderStatus,
    startedEventId: event.startedEventId,
});

/** An orders outbox event, from its persisted form. */
export const fromPersistedOrdersOutboxEvent = (
    event: IPersistedOrdersOutboxEvent,
    instantAt: InstantAt,
): OrdersOutboxEvent =>
    OrdersOutboxEvent.create({
        id: toOrdersOutboxEventId(event.id),
        eventId: toOrderEventId(event.eventId),
        orderId: toOrderId(event.orderId),
        kind: event.kind,
        at: instantAt(event.at),
        driverId: event.driverId === null ? null : toDriverId(event.driverId),
        orderVersion: toVersionNumber(event.orderVersion),
        orderStatus: event.orderStatus,
        startedEventId:
            event.startedEventId === null ? null : toDeliveryEventId(event.startedEventId),
    });

const toPersistedCopiedEvent = (event: DeliveriesEventCopy): IPersistedDeliveriesEventCopy => ({
    id: event.id,
    eventId: event.eventId,
    orderId: event.orderId,
    kind: event.kind,
    at: event.at.sinceStart.milliseconds,
    driverId: event.driverId,
    wasStartedByDeliveries: event.wasStartedByDeliveries,
});

const fromPersistedCopiedEvent = (
    event: IPersistedDeliveriesEventCopy,
    instantAt: InstantAt,
): DeliveriesEventCopy =>
    DeliveriesEventCopy.create({
        id: toDeliveriesOutboxEventId(event.id),
        eventId: toDeliveryEventId(event.eventId),
        orderId: toOrderId(event.orderId),
        kind: event.kind,
        at: instantAt(event.at),
        driverId: event.driverId === null ? null : toDriverId(event.driverId),
        wasStartedByDeliveries: event.wasStartedByDeliveries,
    });

const toPersistedCopy = (copy: DeliveryCopy): IPersistedDeliveryCopy => ({
    orderId: copy.orderId,
    orderDeliveryId: copy.orderDeliveryId,
});

const fromPersistedCopy = (copy: IPersistedDeliveryCopy): DeliveryCopy =>
    DeliveryCopy.create({
        orderId: toOrderId(copy.orderId),
        orderDeliveryId: toOrderDeliveryId(copy.orderDeliveryId),
    });

const toPersistedCopyVersion = (version: DeliveryCopyVersion): IPersistedDeliveryCopyVersion => ({
    number: version.number,
    previous: version.previous === null ? null : toPersistedCopyVersion(version.previous),
    orderId: version.orderId,
    events: version.events.map(toPersistedCopiedEvent).toArray(),
});

function fromPersistedCopyVersion(
    version: IPersistedDeliveryCopyVersion,
    instantAt: InstantAt,
): DeliveryCopyVersion {
    const events = version.events.map((item) => fromPersistedCopiedEvent(item, instantAt));
    return DeliveryCopyVersion.create({
        orderId: toOrderId(version.orderId),
        events: List(events),
        number: toVersionNumber(version.number),
        previous:
            version.previous === null
                ? null
                : fromPersistedCopyVersion(version.previous, instantAt),
    });
}

/** The orders module's state, persisted. */
export const toPersistedOrdersState = (state: OrdersState): IPersistedOrdersState => ({
    orders: toPersistedRecords(state.orders, toPersistedOrder),
    orderVersions: toPersistedRecords(state.orderVersions, toPersistedOrderVersion),
    restaurants: state.restaurants
        .entrySeq()
        .map(([orderId, restaurant]) => ({
            orderId,
            restaurant: toPersistedRestaurantPlace(restaurant),
        }))
        .toArray(),
    eventsByOrder: toPersistedGroups(state.eventsByOrder, toPersistedOrderEvent),
    outbox: state.outbox.map(toPersistedOrdersOutboxEvent).toArray(),
    inbox: toPersistedInbox(state.inbox),
    inboxPosition: toPersistedInboxPosition(state.inboxPosition),
    copies: toPersistedRecords(state.copies, toPersistedCopy),
    copyVersions: toPersistedRecords(state.copyVersions, toPersistedCopyVersion),
    nextOrder: state.nextOrder,
});

/** The orders module's state, from its persisted form. */
export function fromPersistedOrdersState(
    state: IPersistedOrdersState,
    instantAt: InstantAt,
): OrdersState {
    const restaurants = state.restaurants.map((entry): [OrderId, RestaurantPlace] => [
        toOrderId(entry.orderId),
        fromPersistedRestaurantPlace(entry.restaurant),
    ]);
    const outbox = state.outbox.map((item) => fromPersistedOrdersOutboxEvent(item, instantAt));
    return OrdersState.create({
        orders: fromPersistedRecords(state.orders, fromPersistedOrder, (order) => order.id),
        orderVersions: fromPersistedRecords(
            state.orderVersions,
            fromPersistedOrderVersion,
            (version) => version.orderId,
        ),
        restaurants: OrderedMap(restaurants),
        eventsByOrder: fromPersistedGroups(state.eventsByOrder, toOrderId, (item) =>
            fromPersistedOrderEvent(item, instantAt),
        ),
        outbox: List(outbox),
        inbox: fromPersistedInbox(state.inbox, toDeliveriesOutboxEventId, instantAt),
        inboxPosition: fromPersistedInboxPosition(state.inboxPosition, instantAt),
        copies: fromPersistedRecords(state.copies, fromPersistedCopy, (copy) => copy.orderId),
        copyVersions: fromPersistedRecords(
            state.copyVersions,
            (item) => fromPersistedCopyVersion(item, instantAt),
            (version) => version.orderId,
        ),
        nextOrder: toCount(state.nextOrder),
    });
}
