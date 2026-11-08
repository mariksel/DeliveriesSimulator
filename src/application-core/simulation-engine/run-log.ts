import type { List } from 'immutable';
import { OrderedMap } from 'immutable';

import type { DeliveriesReport } from '../../domain/drivers/deliveries/deliveries-report';
import { DeliveriesReportKind } from '../../domain/drivers/deliveries/deliveries-report';
import { appendEntry } from '../../domain/event-log/event-log';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { OrdersReport } from '../../domain/orders/orders-report';
import { OrdersReportKind } from '../../domain/orders/orders-report';
import { required } from '../../domain/system/validation/required';
import { unreachable } from '../../domain/system/validation/unreachable';
import type { LogSequence } from '../../domain/event-log/numbers';
import type { IInstant } from '../../domain/system/time/instant';
import type { RunLogEntry, RunLogRecord } from './run-log-entry';
import { eventRecordOf, isModuleEvent, isOutboxEntry } from './run-log-entry';
import type { OrdersOutboxEventId } from '../../domain/orders/orders-outbox-event';
import type { DeliveriesOutboxEventId } from '../../domain/drivers/deliveries/deliveries-outbox-event';

const ORDERS = LogSource.Orders;
const DELIVERIES = LogSource.Deliveries;

/** A run's log, with what it needs to work out what caused each new entry. */
export interface IRunLog {
    readonly entries: List<RunLogEntry>;
    readonly eventSequences: OrderedMap<string, LogSequence>;
    readonly outboxSequences: OrderedMap<string, LogSequence>;
}

/** What is being carried out while an entry is written. */
export interface ICause {
    /** The entry that everything written now is caused by, if nothing more specific is. */
    readonly current: LogSequence | undefined;
    /**
     * An event made while reading an inbox is caused by that read, not by the event it matches.
     */
    readonly isReadingInbox: boolean;
}

/** Nothing is being carried out. */
export const NO_CAUSE: ICause = { current: undefined, isReadingInbox: false };

/** A log with nothing in it, for a given empty list. */
export const emptyRunLog = (entries: List<RunLogEntry>): IRunLog => ({
    entries,
    eventSequences: OrderedMap(),
    outboxSequences: OrderedMap(),
});

/**
 * A log with an entry already written added again, as when the log is worked out from the
 * commits. It finds what each event and outbox entry's sequence is, as writing it did.
 */
export function withWrittenEntry(log: IRunLog, entry: RunLogEntry): IRunLog {
    const entries = log.entries.push(entry);
    if (isOutboxEntry(entry)) {
        const outboxSequences = log.outboxSequences.set(entry.data.id, entry.sequence);
        return { ...log, entries, outboxSequences };
    }
    if (isModuleEvent(entry)) {
        const { id } = eventRecordOf(entry);
        const eventSequences = log.eventSequences.set(id, entry.sequence);
        return { ...log, entries, eventSequences };
    }
    return { ...log, entries };
}

/** The sequence number of the latest entry. */
export function lastSequence(log: IRunLog): LogSequence {
    const entry = log.entries.last();
    return required(entry, 'a log entry').sequence;
}

/** Writes one entry, caused by the given entry or else by what is being carried out. */
export function writeEntry(
    log: IRunLog,
    at: IInstant,
    record: RunLogRecord,
    causedBy: LogSequence | undefined,
    cause: ICause,
): IRunLog {
    const entries = appendEntry(log.entries, at, record, causedBy ?? cause.current);
    return { ...log, entries };
}

/** Writes one of a module's events, caused by the event it matches in the other module, if any. */
/** An event to write: its record, and the event it records, with the matching one, if any. */
interface IEventToWrite {
    readonly record: RunLogRecord;
    readonly event: { readonly id: string; readonly at: IInstant };
    readonly matchingEventId: string | null;
}

function writeEvent(log: IRunLog, toWrite: IEventToWrite, cause: ICause): IRunLog {
    const { record, event, matchingEventId } = toWrite;
    const matching =
        matchingEventId === null || cause.isReadingInbox
            ? undefined
            : log.eventSequences.get(matchingEventId);
    const written = writeEntry(log, event.at, record, matching, cause);
    const sequence = lastSequence(written);
    const eventSequences = written.eventSequences.set(event.id, sequence);
    return { ...written, eventSequences };
}

/** Writes an outbox write, caused by the event it carries. */
function writeOutbox(
    log: IRunLog,
    record: RunLogRecord & {
        readonly data: { readonly id: string; readonly eventId: string; readonly at: IInstant };
    },
    cause: ICause,
): IRunLog {
    const causedBy = log.eventSequences.get(record.data.eventId);
    const written = writeEntry(log, record.data.at, record, causedBy, cause);
    const sequence = lastSequence(written);
    const outboxSequences = written.outboxSequences.set(record.data.id, sequence);
    return { ...written, outboxSequences };
}

/**
 * Writes an inbox read. What reading it caused is written next, by the caller, with the cause
 * returned.
 */
function writeInboxRead(
    log: IRunLog,
    at: IInstant,
    source: typeof ORDERS | typeof DELIVERIES,
    outboxEventId: OrdersOutboxEventId | DeliveriesOutboxEventId,
    cause: ICause,
): { readonly log: IRunLog; readonly cause: ICause } {
    const causedBy = log.outboxSequences.get(outboxEventId);
    const record: RunLogRecord = {
        source,
        kind: TechnicalLogKind.InboxEventRead,
        data: { outboxEventId },
    };
    const written = writeEntry(log, at, record, causedBy, cause);
    return { log: written, cause: { current: lastSequence(written), isReadingInbox: true } };
}

function writeOrdersReport(log: IRunLog, report: OrdersReport, cause: ICause): IRunLog {
    switch (report.kind) {
        case OrdersReportKind.OrderCreated: {
            const record: RunLogRecord = {
                source: ORDERS,
                kind: TechnicalLogKind.OrderCreated,
                data: {
                    id: report.order.id,
                    restaurantId: report.order.restaurantId,
                    status: report.version.status,
                    version: report.version.number,
                    isDeliveryRequestPending: report.version.isDeliveryRequestPending,
                    isReady: report.version.isReady,
                    driverId: report.version.driverId,
                },
            };
            return writeEntry(log, report.at, record, undefined, cause);
        }
        case OrdersReportKind.EventRecorded: {
            const { event, version } = report;
            const data = { event, status: version.status, version: version.number };
            const record = { source: ORDERS, kind: event.kind, data };
            const matchingEventId = event.deliveriesEventId;
            return writeEvent(log, { record, event, matchingEventId }, cause);
        }
        case OrdersReportKind.OutboxWritten: {
            const record = {
                source: ORDERS,
                kind: TechnicalLogKind.OutboxEventWritten,
                data: report.event,
            };
            return writeOutbox(log, record, cause);
        }
        case OrdersReportKind.InboxRead: {
            const read = writeInboxRead(log, report.at, ORDERS, report.event.id, cause);
            return writeOrdersReports(read.log, report.caused, read.cause);
        }
        default:
            return unreachable(report);
    }
}

/** Writes what orders did in a step. */
export const writeOrdersReports = (
    log: IRunLog,
    reports: List<OrdersReport>,
    cause: ICause,
): IRunLog => reports.reduce((written, report) => writeOrdersReport(written, report, cause), log);

function writeDeliveriesReport(log: IRunLog, report: DeliveriesReport, cause: ICause): IRunLog {
    switch (report.kind) {
        case DeliveriesReportKind.EventRecorded: {
            const { event } = report;
            const record = { source: DELIVERIES, kind: event.kind, data: event };
            const matchingEventId = event.ordersEventId;
            return writeEvent(log, { record, event, matchingEventId }, cause);
        }
        case DeliveriesReportKind.OutboxWritten: {
            const record = {
                source: DELIVERIES,
                kind: TechnicalLogKind.OutboxEventWritten,
                data: report.event,
            };
            return writeOutbox(log, record, cause);
        }
        case DeliveriesReportKind.NotificationSent: {
            const { notification, version } = report;
            const causedBy = log.eventSequences.get(notification.requestEventId);
            const record: RunLogRecord = {
                source: DELIVERIES,
                kind: TechnicalLogKind.NotificationSent,
                data: { notification, isOutstanding: version.isOutstanding },
            };
            return writeEntry(log, notification.at, record, causedBy, cause);
        }
        case DeliveriesReportKind.InboxRead: {
            const read = writeInboxRead(log, report.at, DELIVERIES, report.event.id, cause);
            return writeDeliveriesReports(read.log, report.caused, read.cause);
        }
        default:
            return unreachable(report);
    }
}

/** Writes what deliveries did in a step. */
export const writeDeliveriesReports = (
    log: IRunLog,
    reports: List<DeliveriesReport>,
    cause: ICause,
): IRunLog =>
    reports.reduce((written, report) => writeDeliveriesReport(written, report, cause), log);
