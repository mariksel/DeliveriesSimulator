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
import type { IPersistedDeliveryAddress } from '../restaurants/customers/persisted-customer';
import {
    fromPersistedDeliveryAddress,
    toPersistedDeliveryAddress,
} from '../restaurants/customers/persisted-customer';
import type { DeliveryAddress } from '../../domain/restaurants/customers/delivery-address';
import { toAddressId } from '../../domain/restaurants/customers/delivery-address';
import { toCustomerId } from '../../domain/restaurants/customers/customer';
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
import type {
    IPersistedMapChange,
    PersistedListChange,
} from '../system/records/persisted-changes';
import {
    appliedListChange,
    appliedMapChange,
    appliedValueChange,
    listChange,
    mapChange,
    presentOrNone,
    valueChange,
} from '../system/records/persisted-changes';
import type { IPersistedMaker } from '../system/records/persisted-maker';
import { fromPersistedMaker, toPersistedMaker } from '../system/records/persisted-maker';

/** The part of an order that never changes, persisted. */
export interface IPersistedOrder {
    readonly id: string;
    readonly restaurantId: string;
    readonly customerId: string;
    readonly addressId: string;
}

/** An order's version, persisted with the versions before it. */
export interface IPersistedOrderVersion {
    readonly number: number;
    readonly previous: IPersistedOrderVersion | null;
    readonly orderId: string;
    readonly isDeliveryRequestPending: boolean;
    /** The job run or API call that made this version, or the run's start (FND-81). */
    readonly madeBy: IPersistedMaker;
}

/** The restaurant an order is from, persisted with the order it belongs to. */
export interface IPersistedOrderRestaurant {
    readonly orderId: string;
    readonly restaurant: IPersistedRestaurantPlace;
}

/** The stored address an order goes to, persisted with the order it belongs to (FND-90). */
export interface IPersistedOrderAddress {
    readonly orderId: string;
    readonly address: IPersistedDeliveryAddress;
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
    /** The job run or API call that made this version, or the run's start (FND-81). */
    readonly madeBy: IPersistedMaker;
}

/** The orders module's state, persisted. */
export interface IPersistedOrdersState {
    readonly orders: readonly IPersistedOrder[];
    readonly orderVersions: readonly IPersistedOrderVersion[];
    readonly restaurants: readonly IPersistedOrderRestaurant[];
    /** Absent for a run saved before orders had customers, which made no order (FND-90). */
    readonly addresses?: readonly IPersistedOrderAddress[];
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
    customerId: order.customerId,
    addressId: order.addressId,
});

const fromPersistedOrder = (order: IPersistedOrder): Order =>
    Order.create({
        id: toOrderId(order.id),
        restaurantId: toRestaurantId(order.restaurantId),
        customerId: toCustomerId(order.customerId),
        addressId: toAddressId(order.addressId),
    });

const toPersistedOrderVersion = (
    version: OrderVersion,
    stopAt: OrderVersion | null = null,
): IPersistedOrderVersion => ({
    number: version.number,
    previous:
        version.previous === null || version.previous === stopAt
            ? null
            : toPersistedOrderVersion(version.previous, stopAt),
    orderId: version.orderId,
    isDeliveryRequestPending: version.isDeliveryRequestPending,
    madeBy: toPersistedMaker(version.madeBy),
});

const fromPersistedOrderVersion = (
    version: IPersistedOrderVersion,
    tail: OrderVersion | null = null,
): OrderVersion =>
    OrderVersion.create({
        orderId: toOrderId(version.orderId),
        isDeliveryRequestPending: version.isDeliveryRequestPending,
        number: toVersionNumber(version.number),
        previous:
            version.previous === null ? tail : fromPersistedOrderVersion(version.previous, tail),
        madeBy: fromPersistedMaker(version.madeBy),
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

const toPersistedCopyVersion = (
    version: DeliveryCopyVersion,
    stopAt: DeliveryCopyVersion | null = null,
): IPersistedDeliveryCopyVersion => ({
    number: version.number,
    previous:
        version.previous === null || version.previous === stopAt
            ? null
            : toPersistedCopyVersion(version.previous, stopAt),
    orderId: version.orderId,
    events: version.events.map(toPersistedCopiedEvent).toArray(),
    madeBy: toPersistedMaker(version.madeBy),
});

function fromPersistedCopyVersion(
    version: IPersistedDeliveryCopyVersion,
    instantAt: InstantAt,
    tail: DeliveryCopyVersion | null = null,
): DeliveryCopyVersion {
    const events = version.events.map((item) => fromPersistedCopiedEvent(item, instantAt));
    return DeliveryCopyVersion.create({
        orderId: toOrderId(version.orderId),
        events: List(events),
        number: toVersionNumber(version.number),
        previous:
            version.previous === null
                ? tail
                : fromPersistedCopyVersion(version.previous, instantAt, tail),
        madeBy: fromPersistedMaker(version.madeBy),
    });
}

/** The orders module's state, persisted. */
export const toPersistedOrdersState = (state: OrdersState): IPersistedOrdersState => ({
    orders: toPersistedRecords(state.orders, toPersistedOrder),
    orderVersions: toPersistedRecords(state.orderVersions, (version) =>
        toPersistedOrderVersion(version),
    ),
    restaurants: state.restaurants
        .entrySeq()
        .map(([orderId, restaurant]) => ({
            orderId,
            restaurant: toPersistedRestaurantPlace(restaurant),
        }))
        .toArray(),
    addresses: state.addresses
        .entrySeq()
        .map(([orderId, address]) => ({
            orderId,
            address: toPersistedDeliveryAddress(address),
        }))
        .toArray(),
    eventsByOrder: toPersistedGroups(state.eventsByOrder, toPersistedOrderEvent),
    outbox: state.outbox.map(toPersistedOrdersOutboxEvent).toArray(),
    inbox: toPersistedInbox(state.inbox),
    inboxPosition: toPersistedInboxPosition(state.inboxPosition),
    copies: toPersistedRecords(state.copies, toPersistedCopy),
    copyVersions: toPersistedRecords(state.copyVersions, (version) =>
        toPersistedCopyVersion(version),
    ),
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
    const addresses = (state.addresses ?? []).map((entry): [OrderId, DeliveryAddress] => [
        toOrderId(entry.orderId),
        fromPersistedDeliveryAddress(entry.address),
    ]);
    const outbox = state.outbox.map((item) => fromPersistedOrdersOutboxEvent(item, instantAt));
    return OrdersState.create({
        orders: fromPersistedRecords(state.orders, fromPersistedOrder, (order) => order.id),
        orderVersions: fromPersistedRecords(
            state.orderVersions,
            (item) => fromPersistedOrderVersion(item),
            (version) => version.orderId,
        ),
        restaurants: OrderedMap(restaurants),
        addresses: OrderedMap(addresses),
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

/**
 * The orders module's state's change from its parent's, part by part, each left out when it is
 * the parent's (FND-81). A version is saved down to the one the parent holds.
 */
export interface IPersistedOrdersChange {
    readonly orders?: IPersistedMapChange<IPersistedOrder> | undefined;
    readonly orderVersions?: IPersistedMapChange<IPersistedOrderVersion> | undefined;
    readonly restaurants?: IPersistedMapChange<IPersistedRestaurantPlace> | undefined;
    readonly addresses?: IPersistedMapChange<IPersistedDeliveryAddress> | undefined;
    readonly eventsByOrder?:
        IPersistedMapChange<readonly IPersistedOrderEventRecord[]> | undefined;
    readonly outbox?: PersistedListChange<IPersistedOrdersOutboxEvent> | undefined;
    readonly inbox?: IPersistedMapChange<number> | undefined;
    readonly inboxPosition?: IPersistedInboxPosition | undefined;
    readonly copies?: IPersistedMapChange<IPersistedDeliveryCopy> | undefined;
    readonly copyVersions?: IPersistedMapChange<IPersistedDeliveryCopyVersion> | undefined;
    readonly nextOrder?: number | undefined;
}

/** The orders module's state's change from its parent's, or undefined when it is the parent's. */
export function toPersistedOrdersChange(
    parent: OrdersState,
    child: OrdersState,
): IPersistedOrdersChange | undefined {
    if (parent === child) {
        return undefined;
    }
    return presentOrNone({
        orders: mapChange(parent.orders, child.orders, toOrderId, (order) =>
            toPersistedOrder(order),
        ),
        orderVersions: mapChange(
            parent.orderVersions,
            child.orderVersions,
            toOrderId,
            (version, before) => toPersistedOrderVersion(version, before ?? null),
        ),
        restaurants: mapChange(parent.restaurants, child.restaurants, toOrderId, (place) =>
            toPersistedRestaurantPlace(place),
        ),
        addresses: mapChange(parent.addresses, child.addresses, toOrderId, (address) =>
            toPersistedDeliveryAddress(address),
        ),
        eventsByOrder: mapChange(parent.eventsByOrder, child.eventsByOrder, toOrderId, (events) =>
            events.map(toPersistedOrderEvent).toArray(),
        ),
        outbox: listChange(parent.outbox, child.outbox, toPersistedOrdersOutboxEvent),
        inbox: mapChange(
            parent.inbox,
            child.inbox,
            toDeliveriesOutboxEventId,
            (at) => at.sinceStart.milliseconds,
        ),
        inboxPosition: valueChange(
            parent.inboxPosition,
            child.inboxPosition,
            toPersistedInboxPosition,
        ),
        copies: mapChange(parent.copies, child.copies, toOrderId, toPersistedCopy),
        copyVersions: mapChange(
            parent.copyVersions,
            child.copyVersions,
            toOrderId,
            (version, before) => toPersistedCopyVersion(version, before ?? null),
        ),
        nextOrder: valueChange(parent.nextOrder, child.nextOrder, (next) => next),
    });
}

/** The orders module's state, from its parent's and its change. */
export function fromPersistedOrdersChange(
    parent: OrdersState,
    change: IPersistedOrdersChange | undefined,
    instantAt: InstantAt,
): OrdersState {
    if (change === undefined) {
        return parent;
    }
    return OrdersState.create({
        orders: appliedMapChange(parent.orders, change.orders, toOrderId, (order) =>
            fromPersistedOrder(order),
        ),
        orderVersions: appliedMapChange(
            parent.orderVersions,
            change.orderVersions,
            toOrderId,
            (version, before) => fromPersistedOrderVersion(version, before ?? null),
        ),
        restaurants: appliedMapChange(parent.restaurants, change.restaurants, toOrderId, (place) =>
            fromPersistedRestaurantPlace(place),
        ),
        addresses: appliedMapChange(parent.addresses, change.addresses, toOrderId, (address) =>
            fromPersistedDeliveryAddress(address),
        ),
        eventsByOrder: appliedMapChange(
            parent.eventsByOrder,
            change.eventsByOrder,
            toOrderId,
            (events) => {
                const restored = events.map((event) => fromPersistedOrderEvent(event, instantAt));
                return List(restored);
            },
        ),
        outbox: appliedListChange(parent.outbox, change.outbox, (event) =>
            fromPersistedOrdersOutboxEvent(event, instantAt),
        ),
        inbox: appliedMapChange(parent.inbox, change.inbox, toDeliveriesOutboxEventId, (at) =>
            instantAt(at),
        ),
        inboxPosition: appliedValueChange(parent.inboxPosition, change.inboxPosition, (position) =>
            fromPersistedInboxPosition(position, instantAt),
        ),
        copies: appliedMapChange(parent.copies, change.copies, toOrderId, (copy) =>
            fromPersistedCopy(copy),
        ),
        copyVersions: appliedMapChange(
            parent.copyVersions,
            change.copyVersions,
            toOrderId,
            (version, before) => fromPersistedCopyVersion(version, instantAt, before ?? null),
        ),
        nextOrder: appliedValueChange(parent.nextOrder, change.nextOrder, (next) => toCount(next)),
    });
}
