import type { List } from 'immutable';
import { OrderedMap } from 'immutable';

import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type {
    ILoggedEvent,
    ILoggedInboxRead,
    ILoggedOutboxEvent,
    ILoggedStatus,
    IRunRecord,
} from '../../domain/verification/run-record';
import type {
    InboxReadEntry,
    ModuleEventEntry,
    OutboxEntry,
    RunLogEntry,
} from '../simulation-engine/run-log-entry';
import {
    eventRecordOf,
    isInboxRead,
    isModuleEvent,
    isOutboxEntry,
} from '../simulation-engine/run-log-entry';
import type { OrderId } from '../../domain/orders/order';
import type { OrderStatus } from '../../domain/orders/order-status';

function toEvent(entry: ModuleEventEntry): ILoggedEvent {
    const event = eventRecordOf(entry);
    return {
        sequence: entry.sequence,
        source: entry.source,
        id: event.id,
        orderId: event.orderId,
        kind: entry.kind,
        driverId: event.driverId,
        matchingEventId:
            entry.source === LogSource.Orders
                ? entry.data.event.deliveriesEventId
                : entry.data.ordersEventId,
    };
}

const toOutboxEvent = (entry: OutboxEntry): ILoggedOutboxEvent => ({
    sequence: entry.sequence,
    source: entry.source,
    id: entry.data.id,
    eventId: entry.data.eventId,
    orderId: entry.data.orderId,
    orderVersion: entry.source === LogSource.Orders ? entry.data.orderVersion : null,
    orderStatus: entry.source === LogSource.Orders ? entry.data.orderStatus : null,
});

const toInboxRead = (entry: InboxReadEntry): ILoggedInboxRead => ({
    sequence: entry.sequence,
    source: entry.source,
    outboxEventId: entry.data.outboxEventId,
});

/** The order an orders entry is about, and the status it says the order has, if it says one. */
function statusOf(
    entry: RunLogEntry,
): { readonly orderId: OrderId; readonly status: OrderStatus } | null {
    if (entry.source !== LogSource.Orders) {
        return null;
    }
    if (entry.kind === TechnicalLogKind.OrderCreated) {
        return { orderId: entry.data.id, status: entry.data.status };
    }
    if (entry.kind === TechnicalLogKind.OutboxEventWritten) {
        return { orderId: entry.data.orderId, status: entry.data.orderStatus };
    }
    return isModuleEvent(entry)
        ? { orderId: eventRecordOf(entry).orderId, status: entry.data.status }
        : null;
}

function latestStatuses(entries: List<RunLogEntry>): OrderedMap<OrderId, ILoggedStatus> {
    const none = OrderedMap<OrderId, ILoggedStatus>();
    return entries.reduce((statuses, entry) => {
        const said = statusOf(entry);
        return said === null
            ? statuses
            : statuses.set(said.orderId, { sequence: entry.sequence, status: said.status });
    }, none);
}

/** Reads what a run did from its event log, whose entries are typed. */
export const readRunRecord = (entries: List<RunLogEntry>): IRunRecord => ({
    events: entries.filter(isModuleEvent).map(toEvent),
    outbox: entries.filter(isOutboxEntry).map(toOutboxEvent),
    reads: entries.filter(isInboxRead).map(toInboxRead),
    statuses: latestStatuses(entries),
});
