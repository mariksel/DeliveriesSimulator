import { List, OrderedMap } from 'immutable';

import { deepFrozen } from '../system/classes/deep-freeze.testing';
import type { OrderId } from '../orders/order';
import { toOrderEventId } from '../orders/order-event-id';
import { toOrderId } from '../orders/order';
import type {
    ILoggedEvent,
    ILoggedInboxRead,
    ILoggedOutboxEvent,
    ILoggedStatus,
    IRunRecord,
    ModuleSource,
} from './run-record';
import { toLogSequence } from '../event-log/numbers';
import { toOrdersOutboxEventId } from '../orders/orders-outbox-event';
import { toDeliveriesOutboxEventId } from '../drivers/deliveries/deliveries-outbox-event';

/** An event in the orders module, with what a test does not care about filled in. */
export const eventInOrders = (
    id: string,
    overrides: Partial<ILoggedEvent> = {},
): ILoggedEvent => ({
    sequence: toLogSequence(0),
    source: 'orders',
    id: toOrderEventId(id),
    orderId: toOrderId('A'),
    kind: 'OrderDelivered',
    driverId: null,
    matchingEventId: null,
    ...overrides,
});

/** An event in the deliveries module, with what a test does not care about filled in. */
export const eventInDeliveries = (
    id: string,
    overrides: Partial<ILoggedEvent> = {},
): ILoggedEvent => eventInOrders(id, { source: 'deliveries', ...overrides });

/** An outbox event in the orders module, with what a test does not care about filled in. */
export const outboxInOrders = (
    id: string,
    overrides: Partial<ILoggedOutboxEvent> = {},
): ILoggedOutboxEvent => ({
    sequence: toLogSequence(0),
    source: 'orders',
    id: toOrdersOutboxEventId(id),
    eventId: toOrderEventId('event'),
    orderId: toOrderId('A'),
    orderVersion: null,
    orderStatus: null,
    ...overrides,
});

/** An outbox event in the deliveries module, with what a test does not care about filled in. */
export const outboxInDeliveries = (
    id: string,
    overrides: Partial<ILoggedOutboxEvent> = {},
): ILoggedOutboxEvent => outboxInOrders(id, { source: 'deliveries', ...overrides });

/** A module's reading of an outbox event. */
export const readBy = (
    source: ModuleSource,
    outboxEventId: string,
    sequence = 0,
): ILoggedInboxRead => ({
    sequence: toLogSequence(sequence),
    source,
    // Orders reads deliveries' outbox, and deliveries reads orders'.
    outboxEventId:
        source === 'orders'
            ? toDeliveriesOutboxEventId(outboxEventId)
            : toOrdersOutboxEventId(outboxEventId),
});

/** What a run did, frozen, so a criterion that tries to change it fails loudly. */
export function runRecord(parts: {
    readonly events?: readonly ILoggedEvent[];
    readonly outbox?: readonly ILoggedOutboxEvent[];
    readonly reads?: readonly ILoggedInboxRead[];
    readonly statuses?: Readonly<Record<string, ILoggedStatus>>;
}): IRunRecord {
    const statuses = Object.entries(parts.statuses ?? {}).map(
        ([orderId, status]): [OrderId, ILoggedStatus] => [toOrderId(orderId), status],
    );
    return deepFrozen({
        events: List(parts.events ?? []),
        outbox: List(parts.outbox ?? []),
        reads: List(parts.reads ?? []),
        statuses: OrderedMap(statuses),
    });
}
