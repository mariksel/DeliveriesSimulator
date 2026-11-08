import type { List } from 'immutable';

import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';
import {
    isInboxRead,
    eventRecordOf,
    isModuleEvent,
    isOutboxEntry,
} from '../../application-core/simulation-engine/run-log-entry';
import { TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import { orderOf } from '../../application-core/simulation-engine/run-log-entry-order';

const JSON_INDENT = 2;

/** One row of the event list. */
export interface IEventRow {
    readonly sequence: number;
    readonly time: string;
    readonly source: string;
    readonly kind: string;
    /** Which order it concerns, or blank when the log does not say. */
    readonly order: string;
    readonly causedBy: number | null;
}

/** What the Payload viewer shows of one entry. */
export interface IPayloadView {
    readonly sequence: number;
    readonly kind: string;
    readonly time: string;
    readonly source: string;
    readonly causedBy: number | null;
    readonly trace: number;
    /** The entry's data, exactly as stored, indented. */
    readonly json: string;
}

/** The ID an entry's record has: an event's, an outbox event's, or a notification's. */
export function idOf(entry: RunLogEntry): string | null {
    if (isModuleEvent(entry)) {
        return eventRecordOf(entry).id;
    }
    if (isOutboxEntry(entry)) {
        return entry.data.id;
    }
    if (isInboxRead(entry)) {
        return entry.data.outboxEventId;
    }
    return entry.kind === TechnicalLogKind.NotificationSent ? entry.data.notification.id : null;
}

/** The kind of event an entry's record is about: an event's own, or an outbox event's. */
export function eventKindOf(entry: RunLogEntry): string | null {
    if (isModuleEvent(entry)) {
        return eventRecordOf(entry).kind;
    }
    return isOutboxEntry(entry) ? entry.data.kind : null;
}

/** What the list shows for an entry. */
export const eventRow = (entry: RunLogEntry, entries: List<RunLogEntry>): IEventRow => ({
    sequence: entry.sequence,
    time: formatClockTime(entry.at.sinceStart.milliseconds),
    source: entry.source,
    kind: entry.kind,
    order: orderOf(entry, entries),
    causedBy: entry.causedBy,
});

/** What the Payload viewer shows for an entry. */
export const payloadView = (entry: RunLogEntry): IPayloadView => ({
    sequence: entry.sequence,
    kind: entry.kind,
    time: formatClockTime(entry.at.sinceStart.milliseconds),
    source: entry.source,
    causedBy: entry.causedBy,
    trace: entry.trace,
    json: JSON.stringify(entry.data, null, JSON_INDENT),
});
