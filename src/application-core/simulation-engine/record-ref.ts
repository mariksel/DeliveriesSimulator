import type { DriverId } from '../../domain/drivers/driver';
import { toDriverId } from '../../domain/drivers/driver';
import { DriverLocationVersion } from '../../domain/drivers/driver-location';
import { DriverStatusVersion } from '../../domain/drivers/driver-status';
import type { NotificationId } from '../../domain/drivers/deliveries/notification';
import {
    NotificationVersion,
    toNotificationId,
} from '../../domain/drivers/deliveries/notification';
import { OrderDeliveryVersion } from '../../domain/drivers/deliveries/order-delivery';
import { OrderCopyVersion } from '../../domain/drivers/deliveries/order-copy';
import { DeliveryCopyVersion } from '../../domain/orders/delivery-copy';
import type { OrderId } from '../../domain/orders/order';
import { OrderVersion, toOrderId } from '../../domain/orders/order';
import { unreachable } from '../../domain/system/validation/unreachable';
import type { IMainRoot } from './main-root';
import type { RecordVersion } from './record-version';

export type { RecordVersion };

/** The kinds of record that have versions. */
export const RecordKind = {
    Order: 'Order',
    DeliveryCopy: 'DeliveryCopy',
    Delivery: 'Delivery',
    /** Deliveries' copy of the order, versioned apart from the delivery (FND-81). */
    OrderCopy: 'OrderCopy',
    Notification: 'Notification',
    Driver: 'Driver',
    /** A driver's status, versioned apart from the driver as it changes at its own rate. */
    DriverStatus: 'DriverStatus',
    /** A driver's location, versioned apart from the driver as it changes with every send. */
    DriverLocation: 'DriverLocation',
} as const;

/** One of the values of {@link RecordKind}. */
export type RecordKind = (typeof RecordKind)[keyof typeof RecordKind];

/**
 * A record kept by its order's ID: the order, orders' copy of its delivery, the delivery, or
 * Deliveries' copy of the order.
 */
export interface IOrderRecordRef {
    readonly kind:
        | typeof RecordKind.Order
        | typeof RecordKind.DeliveryCopy
        | typeof RecordKind.Delivery
        | typeof RecordKind.OrderCopy;
    readonly id: OrderId;
}

/** A notification, by its ID. */
export interface INotificationRef {
    readonly kind: typeof RecordKind.Notification;
    readonly id: NotificationId;
}

/** A driver, or their status or location, by the driver's ID. */
export interface IDriverRef {
    readonly kind:
        | typeof RecordKind.Driver
        | typeof RecordKind.DriverStatus
        | typeof RecordKind.DriverLocation;
    readonly id: DriverId;
}

/** A record in the state, by its kind and ID. */
export type RecordRef = IOrderRecordRef | INotificationRef | IDriverRef;

/** A record's kind and ID as one text, which tells records apart in a lookup. */
export type RecordKey = string & { readonly brand: 'RecordKey' };

const SEPARATOR = ':';

/** A record's key: its kind, then its ID, which may itself hold the separator. */
export const keyOf = (record: RecordRef): RecordKey =>
    `${record.kind}${SEPARATOR}${record.id}` as RecordKey;

/** A record from its kind and its ID's text. */
export function recordFrom(kind: string, id: string): RecordRef {
    switch (kind) {
        case RecordKind.Order:
        case RecordKind.DeliveryCopy:
        case RecordKind.Delivery:
        case RecordKind.OrderCopy:
            return { kind, id: toOrderId(id) };
        case RecordKind.Notification:
            return { kind, id: toNotificationId(id) };
        case RecordKind.Driver:
        case RecordKind.DriverStatus:
        case RecordKind.DriverLocation:
            return { kind, id: toDriverId(id) };
        default:
            throw new Error(`No record kind ${kind}.`);
    }
}

/** The record a key names. */
export function recordOf(key: RecordKey): RecordRef {
    const at = key.indexOf(SEPARATOR);
    const kind = key.slice(0, at);
    const id = key.slice(at + 1);
    return recordFrom(kind, id);
}

/** The record a version is of. */
export function recordOfVersion(version: RecordVersion): RecordRef {
    if (version instanceof OrderVersion) {
        return { kind: RecordKind.Order, id: version.orderId };
    }
    if (version instanceof DeliveryCopyVersion) {
        return { kind: RecordKind.DeliveryCopy, id: version.orderId };
    }
    if (version instanceof OrderDeliveryVersion) {
        return { kind: RecordKind.Delivery, id: version.orderId };
    }
    if (version instanceof OrderCopyVersion) {
        return { kind: RecordKind.OrderCopy, id: version.orderId };
    }
    if (version instanceof NotificationVersion) {
        return { kind: RecordKind.Notification, id: version.notificationId };
    }
    if (version instanceof DriverStatusVersion) {
        return { kind: RecordKind.DriverStatus, id: version.driverId };
    }
    if (version instanceof DriverLocationVersion) {
        return { kind: RecordKind.DriverLocation, id: version.driverId };
    }
    return { kind: RecordKind.Driver, id: version.driverId };
}

/** A record's latest version in a root, or undefined when it does not exist there. */
export function versionIn(
    root: Pick<IMainRoot, 'state'>,
    record: RecordRef,
): RecordVersion | undefined {
    const { orders, deliveries, drivers } = root.state;
    switch (record.kind) {
        case RecordKind.Order:
            return orders.orderVersions.get(record.id);
        case RecordKind.DeliveryCopy:
            return orders.copyVersions.get(record.id);
        case RecordKind.Delivery:
            return deliveries.deliveryVersions.get(record.id);
        case RecordKind.OrderCopy:
            return deliveries.orderCopies.get(record.id);
        case RecordKind.Notification:
            return deliveries.notificationVersions.get(record.id);
        case RecordKind.Driver:
            return drivers.driverVersions.get(record.id);
        case RecordKind.DriverStatus:
            return drivers.statuses.get(record.id);
        case RecordKind.DriverLocation:
            return drivers.locations.get(record.id);
        default:
            return unreachable(record);
    }
}

/** Every record's latest version in a root, of every kind. */
export function latestVersionsIn(root: IMainRoot): RecordVersion[] {
    const { orders, deliveries, drivers } = root.state;
    return [
        ...orders.orderVersions.values(),
        ...orders.copyVersions.values(),
        ...deliveries.deliveryVersions.values(),
        ...deliveries.orderCopies.values(),
        ...deliveries.notificationVersions.values(),
        ...drivers.driverVersions.values(),
        ...drivers.statuses.values(),
        ...drivers.locations.values(),
    ];
}
