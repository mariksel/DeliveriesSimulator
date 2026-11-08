import type { DigestField } from '../../domain/system/digests/digest-parts';
import { allTrue, recordPart, textPart } from '../../domain/system/digests/digest-parts';
import type { ILogPosition } from '../../domain/event-log/log-entry';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { unreachable } from '../../domain/system/validation/unreachable';
import type { CommandRefusal } from './command-outcome';
import type {
    ICommandIssuedData,
    ICommandRefusedData,
    IConfigChangedData,
    IInboxReadData,
    INotificationSentData,
    IOrderCreatedData,
    IOrdersEventData,
    ModuleEventEntry,
    OutboxEntry,
    RunLogEntry,
} from './run-log-entry';
import { isModuleEvent, isOutboxEntry } from './run-log-entry';
import type { IndirectEffect } from './indirect-effect';
import { indirectEffectPart, indirectEffectsEqual } from './indirect-effect';

const orderCreatedPart = (data: IOrderCreatedData): string =>
    recordPart([
        { text: data.id },
        { text: data.restaurantId },
        { text: data.status },
        { number: data.version },
        { isTrue: data.isDeliveryRequestPending },
        { isTrue: data.isReady },
        { textOrNull: data.driverId },
    ]);

function ordersEventPart(data: IOrdersEventData): string {
    const event = data.event.digestPart();
    return recordPart([{ part: event }, { text: data.status }, { number: data.version }]);
}

function notificationSentPart(data: INotificationSentData): string {
    const notification = data.notification.digestPart();
    return recordPart([{ part: notification }, { isTrue: data.isOutstanding }]);
}

function commandIssuedPart(data: ICommandIssuedData): string {
    const subject = recordPart([{ text: data.data.order }]);
    return recordPart([{ text: data.actor }, { text: data.name }, { part: subject }]);
}

/** A refusal: a code, or the code from orders that deliveries passed on. */
const refusalPart = (refusal: CommandRefusal): string =>
    typeof refusal === 'string' ? textPart(refusal) : recordPart([{ text: refusal.orders }]);

function commandRefusedPart(data: ICommandRefusedData): string {
    const refusal = refusalPart(data.refusal);
    return recordPart([{ text: data.actor }, { text: data.name }, { part: refusal }]);
}

function configChangedPart(data: IConfigChangedData): string {
    const changes = data.changes
        .map((changed): DigestField => {
            const part = changed.digestPart();
            return { part };
        })
        .toArray();
    return recordPart(changes);
}

const moduleEventPart = (entry: ModuleEventEntry): string =>
    entry.source === LogSource.Orders ? ordersEventPart(entry.data) : entry.data.digestPart();

const outboxPart = (entry: OutboxEntry): string => entry.data.digestPart();

/** An entry's data, written out field by field, by its kind. */
function dataPart(entry: RunLogEntry): string {
    if (isModuleEvent(entry)) {
        return moduleEventPart(entry);
    }
    if (isOutboxEntry(entry)) {
        return outboxPart(entry);
    }
    switch (entry.kind) {
        case TechnicalLogKind.OrderCreated:
            return orderCreatedPart(entry.data);
        case TechnicalLogKind.InboxEventRead:
            return recordPart([{ text: entry.data.outboxEventId }]);
        case TechnicalLogKind.NotificationSent:
            return notificationSentPart(entry.data);
        case TechnicalLogKind.CommandIssued:
            return commandIssuedPart(entry.data);
        case TechnicalLogKind.CommandRefused:
            return commandRefusedPart(entry.data);
        case TechnicalLogKind.ConfigChanged:
            return configChangedPart(entry.data);
        case TechnicalLogKind.IndirectEffectHappened:
            return indirectEffectPart(entry.data);
        default:
            return unreachable(entry);
    }
}

/**
 * A log entry, written out field by field for the run digest: its place in the log, its source
 * and kind, and its typed data.
 */
export function runLogEntryPart(entry: RunLogEntry): string {
    const data = dataPart(entry);
    return recordPart([
        { number: entry.sequence },
        { part: entry.at.digestPart() },
        { text: entry.source },
        { text: entry.kind },
        { numberOrNull: entry.causedBy },
        { number: entry.trace },
        { part: data },
    ]);
}

function orderCreatedEqual(first: IOrderCreatedData, second: RunLogEntry): boolean {
    if (second.kind !== TechnicalLogKind.OrderCreated) {
        return false;
    }
    const { data } = second;
    return allTrue(
        first.id === data.id,
        first.restaurantId === data.restaurantId,
        first.status === data.status,
        first.version === data.version,
        first.isDeliveryRequestPending === data.isDeliveryRequestPending,
        first.isReady === data.isReady,
        first.driverId === data.driverId,
    );
}

const inboxReadsEqual = (first: IInboxReadData, second: RunLogEntry): boolean =>
    second.kind === TechnicalLogKind.InboxEventRead &&
    first.outboxEventId === second.data.outboxEventId;

function notificationsSentEqual(first: INotificationSentData, second: RunLogEntry): boolean {
    if (second.kind !== TechnicalLogKind.NotificationSent) {
        return false;
    }
    const isSameNotification = first.notification.equals(second.data.notification);
    return allTrue(isSameNotification, first.isOutstanding === second.data.isOutstanding);
}

function commandsIssuedEqual(first: ICommandIssuedData, second: RunLogEntry): boolean {
    if (second.kind !== TechnicalLogKind.CommandIssued) {
        return false;
    }
    const { data } = second;
    return allTrue(
        first.actor === data.actor,
        first.name === data.name,
        first.data.order === data.data.order,
    );
}

function refusalsEqual(first: CommandRefusal, second: CommandRefusal): boolean {
    if (typeof first === 'string' || typeof second === 'string') {
        return first === second;
    }
    return first.orders === second.orders;
}

function commandsRefusedEqual(first: ICommandRefusedData, second: RunLogEntry): boolean {
    if (second.kind !== TechnicalLogKind.CommandRefused) {
        return false;
    }
    const { data } = second;
    const isSameRefusal = refusalsEqual(first.refusal, data.refusal);
    return allTrue(first.actor === data.actor, first.name === data.name, isSameRefusal);
}

function configChangesEqual(first: IConfigChangedData, second: RunLogEntry): boolean {
    if (second.kind !== TechnicalLogKind.ConfigChanged) {
        return false;
    }
    const others = second.data.changes;
    return (
        first.changes.size === others.size &&
        first.changes.every((changed, index) => {
            const other = others.get(index);
            return other !== undefined && changed.equals(other);
        })
    );
}

function indirectEffectsHappenedEqual(first: IndirectEffect, second: RunLogEntry): boolean {
    if (second.kind !== TechnicalLogKind.IndirectEffectHappened) {
        return false;
    }
    return indirectEffectsEqual(first, second.data);
}

function ordersEventsEqual(first: IOrdersEventData, second: IOrdersEventData): boolean {
    const isSameEvent = first.event.equals(second.event);
    return allTrue(isSameEvent, first.status === second.status, first.version === second.version);
}

function moduleEventsEqual(first: ModuleEventEntry, second: RunLogEntry): boolean {
    if (!isModuleEvent(second)) {
        return false;
    }
    if (first.source === LogSource.Orders) {
        return second.source === LogSource.Orders && ordersEventsEqual(first.data, second.data);
    }
    return second.source === LogSource.Deliveries && first.data.equals(second.data);
}

function outboxEventsEqual(first: OutboxEntry, second: RunLogEntry): boolean {
    if (!isOutboxEntry(second)) {
        return false;
    }
    if (first.source === LogSource.Orders) {
        return second.source === LogSource.Orders && first.data.equals(second.data);
    }
    return second.source === LogSource.Deliveries && first.data.equals(second.data);
}

/** Whether the second entry holds the same typed data as the first, of the first one's kind. */
function dataEqual(first: RunLogEntry, second: RunLogEntry): boolean {
    if (isModuleEvent(first)) {
        return moduleEventsEqual(first, second);
    }
    if (isOutboxEntry(first)) {
        return outboxEventsEqual(first, second);
    }
    switch (first.kind) {
        case TechnicalLogKind.OrderCreated:
            return orderCreatedEqual(first.data, second);
        case TechnicalLogKind.InboxEventRead:
            return inboxReadsEqual(first.data, second);
        case TechnicalLogKind.NotificationSent:
            return notificationsSentEqual(first.data, second);
        case TechnicalLogKind.CommandIssued:
            return commandsIssuedEqual(first.data, second);
        case TechnicalLogKind.CommandRefused:
            return commandsRefusedEqual(first.data, second);
        case TechnicalLogKind.ConfigChanged:
            return configChangesEqual(first.data, second);
        case TechnicalLogKind.IndirectEffectHappened:
            return indirectEffectsHappenedEqual(first.data, second);
        default:
            return unreachable(first);
    }
}

function positionsEqual(first: ILogPosition, second: ILogPosition): boolean {
    const isSameAt = first.at.equals(second.at);
    return allTrue(
        first.sequence === second.sequence,
        isSameAt,
        first.causedBy === second.causedBy,
        first.trace === second.trace,
    );
}

/**
 * Whether two log entries are the same, field by field: their place in the log, their source and
 * kind, and their typed data. It must agree with {@link runLogEntryPart}: two entries are equal
 * exactly when they are written out the same, and the tests check this.
 */
export function runLogEntriesEqual(first: RunLogEntry, second: RunLogEntry): boolean {
    const isSamePosition = positionsEqual(first, second);
    const isSameHeading = allTrue(
        isSamePosition,
        first.source === second.source,
        first.kind === second.kind,
    );
    return isSameHeading && dataEqual(first, second);
}
