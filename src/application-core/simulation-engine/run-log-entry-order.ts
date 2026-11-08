import type { List } from 'immutable';

import { TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { RunLogEntry } from './run-log-entry';
import { eventRecordOf, isModuleEvent, isOutboxEntry } from './run-log-entry';

/** The order an entry names itself, if it names one. */
function ownOrder(entry: RunLogEntry): string | null {
    if (isModuleEvent(entry)) {
        return eventRecordOf(entry).orderId;
    }
    if (isOutboxEntry(entry)) {
        return entry.data.orderId;
    }
    if (entry.kind === TechnicalLogKind.OrderCreated) {
        return entry.data.id;
    }
    return entry.kind === TechnicalLogKind.CommandIssued ? entry.data.data.order : null;
}

/**
 * An entry's order: its own, or else the order of what caused it, such as an inbox read's outbox
 * event; blank when the log does not say. The event list shows it, and a breakpoint can be
 * narrowed to it (FND-88).
 */
export function orderOf(entry: RunLogEntry, entries: List<RunLogEntry>): string {
    const own = ownOrder(entry);
    if (own !== null) {
        return own;
    }
    const cause = entry.causedBy === null ? undefined : entries.get(entry.causedBy);
    return cause === undefined ? '' : orderOf(cause, entries);
}
