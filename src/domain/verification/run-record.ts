import type { List, OrderedMap } from 'immutable';

import type { DeliveryEventKind } from '../drivers/deliveries/delivery-event-kind';
import type { LogSource } from '../event-log/log-vocabulary';
import type { DeliveryEventId } from '../drivers/deliveries/delivery-event-id';
import type { DriverId } from '../drivers/driver';
import type { OrderEventId } from '../orders/order-event-id';
import type { OrderId } from '../orders/order';
import type { OrderEventKind } from '../orders/order-event-kind';
import type { OrderStatus } from '../orders/order-status';
import type { LogSequence } from '../event-log/numbers';
import type { VersionNumber } from '../system/records/version-chain';
import type { OrdersOutboxEventId } from '../orders/orders-outbox-event';
import type { DeliveriesOutboxEventId } from '../drivers/deliveries/deliveries-outbox-event';

/** One of the two modules whose events, outboxes, and inboxes a run's record holds. */
export type ModuleSource = typeof LogSource.Orders | typeof LogSource.Deliveries;

/** An event a module recorded, as the log shows it. */
export interface ILoggedEvent {
    readonly sequence: LogSequence;
    readonly source: ModuleSource;
    readonly id: OrderEventId | DeliveryEventId;
    readonly orderId: OrderId;
    readonly kind: OrderEventKind | DeliveryEventKind;
    readonly driverId: DriverId | null;
    /** The event in the other module that this one matches, if the log says so. */
    readonly matchingEventId: OrderEventId | DeliveryEventId | null;
}

/** An event a module wrote to its outbox, as the log shows it. */
export interface ILoggedOutboxEvent {
    readonly sequence: LogSequence;
    readonly source: ModuleSource;
    readonly id: OrdersOutboxEventId | DeliveriesOutboxEventId;
    readonly eventId: OrderEventId | DeliveryEventId;
    readonly orderId: OrderId;
    readonly orderVersion: VersionNumber | null;
    readonly orderStatus: OrderStatus | null;
}

/** An outbox event a module read, as the log shows it. */
export interface ILoggedInboxRead {
    readonly sequence: LogSequence;
    readonly source: ModuleSource;
    readonly outboxEventId: OrdersOutboxEventId | DeliveriesOutboxEventId;
}

/** An order's latest status in the orders module, and the entry that says so. */
export interface ILoggedStatus {
    readonly sequence: LogSequence;
    readonly status: OrderStatus;
}

/**
 * What a run did, read from its event log alone. Application.Core reads it from the typed log
 * entries.
 */
export interface IRunRecord {
    readonly events: List<ILoggedEvent>;
    readonly outbox: List<ILoggedOutboxEvent>;
    readonly reads: List<ILoggedInboxRead>;
    readonly statuses: OrderedMap<OrderId, ILoggedStatus>;
}
