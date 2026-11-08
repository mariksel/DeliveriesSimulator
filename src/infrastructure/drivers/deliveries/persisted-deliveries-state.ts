import { List, OrderedMap } from 'immutable';

import { DeliveriesOutboxEvent } from '../../../domain/drivers/deliveries/deliveries-outbox-event';
import { DeliveriesState } from '../../../domain/drivers/deliveries/deliveries-state';
import type { DeliveryEventKind } from '../../../domain/drivers/deliveries/delivery-event-kind';
import { DeliveryEventRecord } from '../../../domain/drivers/deliveries/delivery-event-record';
import {
    Notification,
    NotificationVersion,
} from '../../../domain/drivers/deliveries/notification';
import type { DeliveryState } from '../../../domain/drivers/deliveries/order-delivery';
import {
    OrderCopy,
    OrderDelivery,
    OrderDeliveryVersion,
} from '../../../domain/drivers/deliveries/order-delivery';
import type { DeliveryEventId } from '../../../domain/drivers/deliveries/delivery-event-id';
import type { OrderEventId } from '../../../domain/orders/order-event-id';
import type { IPersistedRestaurantPlace } from '../../restaurants/persisted-restaurant-place';
import {
    fromPersistedRestaurantPlace,
    toPersistedRestaurantPlace,
} from '../../restaurants/persisted-restaurant-place';
import { toDeliveryEventId } from '../../../domain/drivers/deliveries/delivery-event-id';
import { toDriverId } from '../../../domain/drivers/driver';
import { toNotificationId } from '../../../domain/drivers/deliveries/notification';
import { toOrderDeliveryId } from '../../../domain/drivers/deliveries/order-delivery';
import { toOrderEventId } from '../../../domain/orders/order-event-id';
import { toOrderId } from '../../../domain/orders/order';
import type { IPersistedGroup } from '../../system/records/persisted-groups';
import {
    fromPersistedGroups,
    fromPersistedRecords,
    toPersistedGroups,
    toPersistedRecords,
} from '../../system/records/persisted-groups';
import type {
    IPersistedInboxPosition,
    IPersistedInboxRecord,
} from '../../system/messaging/persisted-inbox';
import {
    fromPersistedInbox,
    fromPersistedInboxPosition,
    toPersistedInbox,
    toPersistedInboxPosition,
} from '../../system/messaging/persisted-inbox';
import { DeliveryHandoff } from '../../../domain/drivers/deliveries/delivery-handoff';
import type { OrderStatus } from '../../../domain/orders/order-status';
import { toVersionNumber } from '../../../domain/system/records/version-chain';
import { toCount } from '../../../domain/system/math/math';
import type { InstantAt } from '../../../domain/system/time/instant';
import { toDeliveriesOutboxEventId } from '../../../domain/drivers/deliveries/deliveries-outbox-event';
import { toOrdersOutboxEventId } from '../../../domain/orders/orders-outbox-event';

/** What orders handed over with a delivery request, persisted. */
export interface IPersistedDeliveryHandoff {
    readonly orderId: string;
    readonly restaurant: IPersistedRestaurantPlace;
    readonly requestEventId: string;
    readonly orderVersion: number;
    readonly orderStatus: OrderStatus;
}

/** The part of an order's delivery that never changes, persisted. */
export interface IPersistedOrderDelivery {
    readonly id: string;
    readonly orderId: string;
    readonly restaurant: IPersistedRestaurantPlace;
}

/** Deliveries' copy of an order, persisted. */
export interface IPersistedOrderCopy {
    readonly status: OrderStatus;
    readonly version: number;
    readonly eventIds: readonly string[];
}

/** An order delivery's version, persisted with the versions before it. */
export interface IPersistedOrderDeliveryVersion {
    readonly number: number;
    readonly previous: IPersistedOrderDeliveryVersion | null;
    readonly orderDeliveryId: string;
    readonly orderId: string;
    readonly state: DeliveryState;
    readonly driverId: string | null;
    readonly orderCopy: IPersistedOrderCopy;
}

/** A deliveries event, persisted. */
export interface IPersistedDeliveryEventRecord {
    readonly id: string;
    readonly orderDeliveryId: string;
    readonly orderId: string;
    readonly kind: DeliveryEventKind;
    readonly at: number;
    readonly driverId: string | null;
    readonly ordersEventId: string | null;
}

/** A deliveries outbox event, persisted. */
export interface IPersistedDeliveriesOutboxEvent {
    readonly id: string;
    readonly eventId: string;
    readonly orderDeliveryId: string;
    readonly orderId: string;
    readonly kind: DeliveryEventKind;
    readonly at: number;
    readonly driverId: string | null;
    readonly wasStartedByDeliveries: boolean;
}

/** A link from a deliveries event to the orders event matching it, persisted. */
export interface IPersistedEventLink {
    readonly deliveryEventId: string;
    readonly ordersEventId: string;
}

/** The part of a notification that never changes, persisted. */
export interface IPersistedNotification {
    readonly id: string;
    readonly orderDeliveryId: string;
    readonly requestEventId: string;
    readonly driverId: string;
    readonly at: number;
}

/** A notification's version, persisted with the versions before it. */
export interface IPersistedNotificationVersion {
    readonly number: number;
    readonly previous: IPersistedNotificationVersion | null;
    readonly notificationId: string;
    readonly isOutstanding: boolean;
}

/** The Deliveries submodule's state, persisted. */
export interface IPersistedDeliveriesState {
    readonly deliveries: readonly IPersistedOrderDelivery[];
    readonly deliveryVersions: readonly IPersistedOrderDeliveryVersion[];
    readonly eventsByOrder: readonly IPersistedGroup<IPersistedDeliveryEventRecord>[];
    readonly ordersEventLinks: readonly IPersistedEventLink[];
    readonly outbox: readonly IPersistedDeliveriesOutboxEvent[];
    readonly inbox: readonly IPersistedInboxRecord[];
    readonly inboxPosition: IPersistedInboxPosition;
    readonly notificationsByOrder: readonly IPersistedGroup<IPersistedNotification>[];
    readonly notificationVersions: readonly IPersistedNotificationVersion[];
    readonly nextDelivery: number;
}

/** What orders handed over with a delivery request, persisted. */
export const toPersistedDeliveryHandoff = (
    handoff: DeliveryHandoff,
): IPersistedDeliveryHandoff => ({
    orderId: handoff.orderId,
    restaurant: toPersistedRestaurantPlace(handoff.restaurant),
    requestEventId: handoff.requestEventId,
    orderVersion: handoff.orderVersion,
    orderStatus: handoff.orderStatus,
});

/** What orders handed over with a delivery request, from its persisted form. */
export function fromPersistedDeliveryHandoff(handoff: IPersistedDeliveryHandoff): DeliveryHandoff {
    const restaurant = fromPersistedRestaurantPlace(handoff.restaurant);
    const orderId = toOrderId(handoff.orderId);
    const requestEventId = toOrderEventId(handoff.requestEventId);
    return DeliveryHandoff.create({
        orderId,
        restaurant,
        requestEventId,
        orderVersion: toVersionNumber(handoff.orderVersion),
        orderStatus: handoff.orderStatus,
    });
}

const toPersistedOrderCopy = (copy: OrderCopy): IPersistedOrderCopy => ({
    status: copy.status,
    version: copy.version,
    eventIds: copy.eventIds.toArray(),
});

function fromPersistedOrderCopy(copy: IPersistedOrderCopy): OrderCopy {
    const eventIds = copy.eventIds.map(toOrderEventId);
    return OrderCopy.create({
        status: copy.status,
        version: toVersionNumber(copy.version),
        eventIds: List(eventIds),
    });
}

const toPersistedDeliveryVersion = (
    version: OrderDeliveryVersion,
): IPersistedOrderDeliveryVersion => ({
    number: version.number,
    previous: version.previous === null ? null : toPersistedDeliveryVersion(version.previous),
    orderDeliveryId: version.orderDeliveryId,
    orderId: version.orderId,
    state: version.state,
    driverId: version.driverId,
    orderCopy: toPersistedOrderCopy(version.orderCopy),
});

const fromPersistedDeliveryVersion = (
    version: IPersistedOrderDeliveryVersion,
): OrderDeliveryVersion =>
    OrderDeliveryVersion.create({
        orderDeliveryId: toOrderDeliveryId(version.orderDeliveryId),
        orderId: toOrderId(version.orderId),
        state: version.state,
        driverId: version.driverId === null ? null : toDriverId(version.driverId),
        orderCopy: fromPersistedOrderCopy(version.orderCopy),
        number: toVersionNumber(version.number),
        previous:
            version.previous === null ? null : fromPersistedDeliveryVersion(version.previous),
    });

const toPersistedDelivery = (delivery: OrderDelivery): IPersistedOrderDelivery => ({
    id: delivery.id,
    orderId: delivery.orderId,
    restaurant: toPersistedRestaurantPlace(delivery.restaurant),
});

const fromPersistedDelivery = (delivery: IPersistedOrderDelivery): OrderDelivery =>
    OrderDelivery.create({
        id: toOrderDeliveryId(delivery.id),
        orderId: toOrderId(delivery.orderId),
        restaurant: fromPersistedRestaurantPlace(delivery.restaurant),
    });

/** A deliveries event, persisted. */
export const toPersistedDeliveryEvent = (
    event: DeliveryEventRecord,
): IPersistedDeliveryEventRecord => ({
    id: event.id,
    orderDeliveryId: event.orderDeliveryId,
    orderId: event.orderId,
    kind: event.kind,
    at: event.at.sinceStart.milliseconds,
    driverId: event.driverId,
    ordersEventId: event.ordersEventId,
});

/** A deliveries event, from its persisted form. */
export const fromPersistedDeliveryEvent = (
    event: IPersistedDeliveryEventRecord,
    instantAt: InstantAt,
): DeliveryEventRecord =>
    DeliveryEventRecord.create({
        id: toDeliveryEventId(event.id),
        orderDeliveryId: toOrderDeliveryId(event.orderDeliveryId),
        orderId: toOrderId(event.orderId),
        kind: event.kind,
        at: instantAt(event.at),
        driverId: event.driverId === null ? null : toDriverId(event.driverId),
        ordersEventId: event.ordersEventId === null ? null : toOrderEventId(event.ordersEventId),
    });

/** A deliveries outbox event, persisted. */
export const toPersistedDeliveriesOutboxEvent = (
    event: DeliveriesOutboxEvent,
): IPersistedDeliveriesOutboxEvent => ({
    id: event.id,
    eventId: event.eventId,
    orderDeliveryId: event.orderDeliveryId,
    orderId: event.orderId,
    kind: event.kind,
    at: event.at.sinceStart.milliseconds,
    driverId: event.driverId,
    wasStartedByDeliveries: event.wasStartedByDeliveries,
});

/** A deliveries outbox event, from its persisted form. */
export const fromPersistedDeliveriesOutboxEvent = (
    event: IPersistedDeliveriesOutboxEvent,
    instantAt: InstantAt,
): DeliveriesOutboxEvent =>
    DeliveriesOutboxEvent.create({
        id: toDeliveriesOutboxEventId(event.id),
        eventId: toDeliveryEventId(event.eventId),
        orderDeliveryId: toOrderDeliveryId(event.orderDeliveryId),
        orderId: toOrderId(event.orderId),
        kind: event.kind,
        at: instantAt(event.at),
        driverId: event.driverId === null ? null : toDriverId(event.driverId),
        wasStartedByDeliveries: event.wasStartedByDeliveries,
    });

/** A notification, persisted. */
export const toPersistedNotification = (notification: Notification): IPersistedNotification => ({
    id: notification.id,
    orderDeliveryId: notification.orderDeliveryId,
    requestEventId: notification.requestEventId,
    driverId: notification.driverId,
    at: notification.at.sinceStart.milliseconds,
});

/** A notification, from its persisted form. */
export const fromPersistedNotification = (
    notification: IPersistedNotification,
    instantAt: InstantAt,
): Notification =>
    Notification.create({
        id: toNotificationId(notification.id),
        orderDeliveryId: toOrderDeliveryId(notification.orderDeliveryId),
        requestEventId: toDeliveryEventId(notification.requestEventId),
        driverId: toDriverId(notification.driverId),
        at: instantAt(notification.at),
    });

const toPersistedNotificationVersion = (
    version: NotificationVersion,
): IPersistedNotificationVersion => ({
    number: version.number,
    previous: version.previous === null ? null : toPersistedNotificationVersion(version.previous),
    notificationId: version.notificationId,
    isOutstanding: version.isOutstanding,
});

const fromPersistedNotificationVersion = (
    version: IPersistedNotificationVersion,
): NotificationVersion =>
    NotificationVersion.create({
        notificationId: toNotificationId(version.notificationId),
        isOutstanding: version.isOutstanding,
        number: toVersionNumber(version.number),
        previous:
            version.previous === null ? null : fromPersistedNotificationVersion(version.previous),
    });

/** The Deliveries submodule's state, persisted. */
export const toPersistedDeliveriesState = (state: DeliveriesState): IPersistedDeliveriesState => ({
    deliveries: toPersistedRecords(state.deliveries, toPersistedDelivery),
    deliveryVersions: toPersistedRecords(state.deliveryVersions, toPersistedDeliveryVersion),
    eventsByOrder: toPersistedGroups(state.eventsByOrder, toPersistedDeliveryEvent),
    ordersEventLinks: state.ordersEventLinks
        .entrySeq()
        .map(([deliveryEventId, ordersEventId]) => ({ deliveryEventId, ordersEventId }))
        .toArray(),
    outbox: state.outbox.map(toPersistedDeliveriesOutboxEvent).toArray(),
    inbox: toPersistedInbox(state.inbox),
    inboxPosition: toPersistedInboxPosition(state.inboxPosition),
    notificationsByOrder: toPersistedGroups(state.notificationsByOrder, toPersistedNotification),
    notificationVersions: toPersistedRecords(
        state.notificationVersions,
        toPersistedNotificationVersion,
    ),
    nextDelivery: state.nextDelivery,
});

/** The Deliveries submodule's state, from its persisted form. */
export function fromPersistedDeliveriesState(
    state: IPersistedDeliveriesState,
    instantAt: InstantAt,
): DeliveriesState {
    const links = state.ordersEventLinks.map((link): [DeliveryEventId, OrderEventId] => [
        toDeliveryEventId(link.deliveryEventId),
        toOrderEventId(link.ordersEventId),
    ]);
    const outbox = state.outbox.map((item) => fromPersistedDeliveriesOutboxEvent(item, instantAt));
    return DeliveriesState.create({
        deliveries: fromPersistedRecords(
            state.deliveries,
            fromPersistedDelivery,
            (delivery) => delivery.orderId,
        ),
        deliveryVersions: fromPersistedRecords(
            state.deliveryVersions,
            fromPersistedDeliveryVersion,
            (version) => version.orderId,
        ),
        eventsByOrder: fromPersistedGroups(state.eventsByOrder, toOrderId, (item) =>
            fromPersistedDeliveryEvent(item, instantAt),
        ),
        ordersEventLinks: OrderedMap(links),
        outbox: List(outbox),
        inbox: fromPersistedInbox(state.inbox, toOrdersOutboxEventId, instantAt),
        inboxPosition: fromPersistedInboxPosition(state.inboxPosition, instantAt),
        notificationsByOrder: fromPersistedGroups(state.notificationsByOrder, toOrderId, (item) =>
            fromPersistedNotification(item, instantAt),
        ),
        notificationVersions: fromPersistedRecords(
            state.notificationVersions,
            fromPersistedNotificationVersion,
            (version) => version.notificationId,
        ),
        nextDelivery: toCount(state.nextDelivery),
    });
}
