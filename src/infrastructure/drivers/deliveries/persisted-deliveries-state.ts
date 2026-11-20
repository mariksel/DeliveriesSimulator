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
import { OrderCopyVersion } from '../../../domain/drivers/deliveries/order-copy';
import {
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
import type {
    IPersistedMapChange,
    PersistedListChange,
} from '../../system/records/persisted-changes';
import {
    appliedListChange,
    appliedMapChange,
    appliedValueChange,
    listChange,
    mapChange,
    presentOrNone,
    valueChange,
} from '../../system/records/persisted-changes';
import type { IPersistedMaker } from '../../system/records/persisted-maker';
import type { IPersistedCoordinates } from '../../map-and-routing/persisted-coordinates';
import {
    fromPersistedCoordinates,
    toPersistedCoordinates,
} from '../../map-and-routing/persisted-coordinates';
import { fromPersistedMaker, toPersistedMaker } from '../../system/records/persisted-maker';

/** What orders handed over with a delivery request, persisted. */
export interface IPersistedDeliveryHandoff {
    readonly orderId: string;
    readonly restaurant: IPersistedRestaurantPlace;
    readonly destination: IPersistedCoordinates;
    readonly requestEventId: string;
    readonly orderVersion: number;
    readonly orderStatus: OrderStatus;
}

/** The part of an order's delivery that never changes, persisted. */
export interface IPersistedOrderDelivery {
    readonly id: string;
    readonly orderId: string;
    readonly restaurant: IPersistedRestaurantPlace;
    readonly destination: IPersistedCoordinates;
}

/** A version of Deliveries' copy of an order, persisted with the versions before it (FND-81). */
export interface IPersistedOrderCopy {
    readonly number: number;
    readonly previous: IPersistedOrderCopy | null;
    readonly orderId: string;
    readonly status: OrderStatus;
    readonly version: number;
    readonly eventIds: readonly string[];
    readonly madeBy: IPersistedMaker;
}

/** An order delivery's version, persisted with the versions before it. */
export interface IPersistedOrderDeliveryVersion {
    readonly number: number;
    readonly previous: IPersistedOrderDeliveryVersion | null;
    readonly orderDeliveryId: string;
    readonly orderId: string;
    readonly state: DeliveryState;
    readonly driverId: string | null;
    /** The job run or API call that made this version, or the run's start (FND-81). */
    readonly madeBy: IPersistedMaker;
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
    /** The job run or API call that made this version, or the run's start (FND-81). */
    readonly madeBy: IPersistedMaker;
}

/** The Deliveries submodule's state, persisted. */
export interface IPersistedDeliveriesState {
    readonly deliveries: readonly IPersistedOrderDelivery[];
    readonly deliveryVersions: readonly IPersistedOrderDeliveryVersion[];
    readonly orderCopies: readonly IPersistedOrderCopy[];
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
    destination: toPersistedCoordinates(handoff.destination),
    requestEventId: handoff.requestEventId,
    orderVersion: handoff.orderVersion,
    orderStatus: handoff.orderStatus,
});

/** What orders handed over with a delivery request, from its persisted form. */
export function fromPersistedDeliveryHandoff(handoff: IPersistedDeliveryHandoff): DeliveryHandoff {
    const restaurant = fromPersistedRestaurantPlace(handoff.restaurant);
    const destination = fromPersistedCoordinates(handoff.destination);
    const orderId = toOrderId(handoff.orderId);
    const requestEventId = toOrderEventId(handoff.requestEventId);
    return DeliveryHandoff.create({
        orderId,
        restaurant,
        destination,
        requestEventId,
        orderVersion: toVersionNumber(handoff.orderVersion),
        orderStatus: handoff.orderStatus,
    });
}

const toPersistedOrderCopy = (
    copy: OrderCopyVersion,
    stopAt: OrderCopyVersion | null = null,
): IPersistedOrderCopy => ({
    number: copy.number,
    previous:
        copy.previous === null || copy.previous === stopAt
            ? null
            : toPersistedOrderCopy(copy.previous, stopAt),
    orderId: copy.orderId,
    status: copy.status,
    version: copy.version,
    eventIds: copy.eventIds.toArray(),
    madeBy: toPersistedMaker(copy.madeBy),
});

function fromPersistedOrderCopy(
    copy: IPersistedOrderCopy,
    tail: OrderCopyVersion | null = null,
): OrderCopyVersion {
    const eventIds = copy.eventIds.map(toOrderEventId);
    const previous = copy.previous === null ? tail : fromPersistedOrderCopy(copy.previous, tail);
    return OrderCopyVersion.create({
        orderId: toOrderId(copy.orderId),
        status: copy.status,
        version: toVersionNumber(copy.version),
        eventIds: List(eventIds),
        number: toVersionNumber(copy.number),
        previous,
        madeBy: fromPersistedMaker(copy.madeBy),
    });
}

const toPersistedDeliveryVersion = (
    version: OrderDeliveryVersion,
    stopAt: OrderDeliveryVersion | null = null,
): IPersistedOrderDeliveryVersion => ({
    number: version.number,
    previous:
        version.previous === null || version.previous === stopAt
            ? null
            : toPersistedDeliveryVersion(version.previous, stopAt),
    orderDeliveryId: version.orderDeliveryId,
    orderId: version.orderId,
    state: version.state,
    driverId: version.driverId,
    madeBy: toPersistedMaker(version.madeBy),
});

const fromPersistedDeliveryVersion = (
    version: IPersistedOrderDeliveryVersion,
    tail: OrderDeliveryVersion | null = null,
): OrderDeliveryVersion =>
    OrderDeliveryVersion.create({
        orderDeliveryId: toOrderDeliveryId(version.orderDeliveryId),
        orderId: toOrderId(version.orderId),
        state: version.state,
        driverId: version.driverId === null ? null : toDriverId(version.driverId),
        number: toVersionNumber(version.number),
        previous:
            version.previous === null
                ? tail
                : fromPersistedDeliveryVersion(version.previous, tail),
        madeBy: fromPersistedMaker(version.madeBy),
    });

const toPersistedDelivery = (delivery: OrderDelivery): IPersistedOrderDelivery => ({
    id: delivery.id,
    orderId: delivery.orderId,
    restaurant: toPersistedRestaurantPlace(delivery.restaurant),
    destination: toPersistedCoordinates(delivery.destination),
});

const fromPersistedDelivery = (delivery: IPersistedOrderDelivery): OrderDelivery =>
    OrderDelivery.create({
        id: toOrderDeliveryId(delivery.id),
        orderId: toOrderId(delivery.orderId),
        restaurant: fromPersistedRestaurantPlace(delivery.restaurant),
        destination: fromPersistedCoordinates(delivery.destination),
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
    stopAt: NotificationVersion | null = null,
): IPersistedNotificationVersion => ({
    number: version.number,
    previous:
        version.previous === null || version.previous === stopAt
            ? null
            : toPersistedNotificationVersion(version.previous, stopAt),
    notificationId: version.notificationId,
    isOutstanding: version.isOutstanding,
    madeBy: toPersistedMaker(version.madeBy),
});

const fromPersistedNotificationVersion = (
    version: IPersistedNotificationVersion,
    tail: NotificationVersion | null = null,
): NotificationVersion =>
    NotificationVersion.create({
        notificationId: toNotificationId(version.notificationId),
        isOutstanding: version.isOutstanding,
        number: toVersionNumber(version.number),
        previous:
            version.previous === null
                ? tail
                : fromPersistedNotificationVersion(version.previous, tail),
        madeBy: fromPersistedMaker(version.madeBy),
    });

/** The Deliveries submodule's state, persisted. */
export const toPersistedDeliveriesState = (state: DeliveriesState): IPersistedDeliveriesState => ({
    deliveries: toPersistedRecords(state.deliveries, toPersistedDelivery),
    deliveryVersions: toPersistedRecords(state.deliveryVersions, (version) =>
        toPersistedDeliveryVersion(version),
    ),
    orderCopies: toPersistedRecords(state.orderCopies, (copy) => toPersistedOrderCopy(copy)),
    eventsByOrder: toPersistedGroups(state.eventsByOrder, toPersistedDeliveryEvent),
    ordersEventLinks: state.ordersEventLinks
        .entrySeq()
        .map(([deliveryEventId, ordersEventId]) => ({ deliveryEventId, ordersEventId }))
        .toArray(),
    outbox: state.outbox.map(toPersistedDeliveriesOutboxEvent).toArray(),
    inbox: toPersistedInbox(state.inbox),
    inboxPosition: toPersistedInboxPosition(state.inboxPosition),
    notificationsByOrder: toPersistedGroups(state.notificationsByOrder, toPersistedNotification),
    notificationVersions: toPersistedRecords(state.notificationVersions, (version) =>
        toPersistedNotificationVersion(version),
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
            (item) => fromPersistedDeliveryVersion(item),
            (version) => version.orderId,
        ),
        orderCopies: fromPersistedRecords(
            state.orderCopies,
            (item) => fromPersistedOrderCopy(item),
            (copy) => copy.orderId,
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
            (item) => fromPersistedNotificationVersion(item),
            (version) => version.notificationId,
        ),
        nextDelivery: toCount(state.nextDelivery),
    });
}

/**
 * The Deliveries submodule's state's change from its parent's, part by part, each left out when
 * it is the parent's (FND-81). A version is saved down to the one the parent holds.
 */
export interface IPersistedDeliveriesChange {
    readonly deliveries?: IPersistedMapChange<IPersistedOrderDelivery> | undefined;
    readonly deliveryVersions?: IPersistedMapChange<IPersistedOrderDeliveryVersion> | undefined;
    readonly orderCopies?: IPersistedMapChange<IPersistedOrderCopy> | undefined;
    readonly eventsByOrder?:
        IPersistedMapChange<readonly IPersistedDeliveryEventRecord[]> | undefined;
    readonly ordersEventLinks?: IPersistedMapChange<string> | undefined;
    readonly outbox?: PersistedListChange<IPersistedDeliveriesOutboxEvent> | undefined;
    readonly inbox?: IPersistedMapChange<number> | undefined;
    readonly inboxPosition?: IPersistedInboxPosition | undefined;
    readonly notificationsByOrder?:
        IPersistedMapChange<readonly IPersistedNotification[]> | undefined;
    readonly notificationVersions?: IPersistedMapChange<IPersistedNotificationVersion> | undefined;
    readonly nextDelivery?: number | undefined;
}

/**
 * The Deliveries submodule's state's change from its parent's, or undefined when it is the
 * parent's.
 */
export function toPersistedDeliveriesChange(
    parent: DeliveriesState,
    child: DeliveriesState,
): IPersistedDeliveriesChange | undefined {
    if (parent === child) {
        return undefined;
    }
    return presentOrNone({
        deliveries: mapChange(parent.deliveries, child.deliveries, toOrderId, (delivery) =>
            toPersistedDelivery(delivery),
        ),
        deliveryVersions: mapChange(
            parent.deliveryVersions,
            child.deliveryVersions,
            toOrderId,
            (version, before) => toPersistedDeliveryVersion(version, before ?? null),
        ),
        orderCopies: mapChange(parent.orderCopies, child.orderCopies, toOrderId, (copy, before) =>
            toPersistedOrderCopy(copy, before ?? null),
        ),
        eventsByOrder: mapChange(parent.eventsByOrder, child.eventsByOrder, toOrderId, (events) =>
            events.map(toPersistedDeliveryEvent).toArray(),
        ),
        ordersEventLinks: mapChange(
            parent.ordersEventLinks,
            child.ordersEventLinks,
            toDeliveryEventId,
            (ordersEventId) => ordersEventId,
        ),
        outbox: listChange(parent.outbox, child.outbox, toPersistedDeliveriesOutboxEvent),
        inbox: mapChange(
            parent.inbox,
            child.inbox,
            toOrdersOutboxEventId,
            (at) => at.sinceStart.milliseconds,
        ),
        inboxPosition: valueChange(
            parent.inboxPosition,
            child.inboxPosition,
            toPersistedInboxPosition,
        ),
        notificationsByOrder: mapChange(
            parent.notificationsByOrder,
            child.notificationsByOrder,
            toOrderId,
            (notifications) => notifications.map(toPersistedNotification).toArray(),
        ),
        notificationVersions: mapChange(
            parent.notificationVersions,
            child.notificationVersions,
            toNotificationId,
            (version, before) => toPersistedNotificationVersion(version, before ?? null),
        ),
        nextDelivery: valueChange(parent.nextDelivery, child.nextDelivery, (next) => next),
    });
}

/** The Deliveries submodule's state, from its parent's and its change. */
export function fromPersistedDeliveriesChange(
    parent: DeliveriesState,
    change: IPersistedDeliveriesChange | undefined,
    instantAt: InstantAt,
): DeliveriesState {
    if (change === undefined) {
        return parent;
    }
    return DeliveriesState.create({
        deliveries: appliedMapChange(parent.deliveries, change.deliveries, toOrderId, (delivery) =>
            fromPersistedDelivery(delivery),
        ),
        deliveryVersions: appliedMapChange(
            parent.deliveryVersions,
            change.deliveryVersions,
            toOrderId,
            (version, before) => fromPersistedDeliveryVersion(version, before ?? null),
        ),
        orderCopies: appliedMapChange(
            parent.orderCopies,
            change.orderCopies,
            toOrderId,
            (copy, before) => fromPersistedOrderCopy(copy, before ?? null),
        ),
        eventsByOrder: appliedMapChange(
            parent.eventsByOrder,
            change.eventsByOrder,
            toOrderId,
            (events) => {
                const restored = events.map((event) =>
                    fromPersistedDeliveryEvent(event, instantAt),
                );
                return List(restored);
            },
        ),
        ordersEventLinks: appliedMapChange(
            parent.ordersEventLinks,
            change.ordersEventLinks,
            toDeliveryEventId,
            (ordersEventId) => toOrderEventId(ordersEventId),
        ),
        outbox: appliedListChange(parent.outbox, change.outbox, (event) =>
            fromPersistedDeliveriesOutboxEvent(event, instantAt),
        ),
        inbox: appliedMapChange(parent.inbox, change.inbox, toOrdersOutboxEventId, (at) =>
            instantAt(at),
        ),
        inboxPosition: appliedValueChange(parent.inboxPosition, change.inboxPosition, (position) =>
            fromPersistedInboxPosition(position, instantAt),
        ),
        notificationsByOrder: appliedMapChange(
            parent.notificationsByOrder,
            change.notificationsByOrder,
            toOrderId,
            (notifications) => {
                const restored = notifications.map((notification) =>
                    fromPersistedNotification(notification, instantAt),
                );
                return List(restored);
            },
        ),
        notificationVersions: appliedMapChange(
            parent.notificationVersions,
            change.notificationVersions,
            toNotificationId,
            (version, before) => fromPersistedNotificationVersion(version, before ?? null),
        ),
        nextDelivery: appliedValueChange(parent.nextDelivery, change.nextDelivery, (next) =>
            toCount(next),
        ),
    });
}
