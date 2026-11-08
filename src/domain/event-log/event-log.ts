import type { List } from 'immutable';

import type { LogSequence } from './numbers';
import type { IInstant } from '../system/time/instant';
import { toLogSequence } from './numbers';
import type { ILogRecord, LogEntry } from './log-entry';

function assertInOrder(log: List<LogEntry>, at: IInstant): void {
    const previous = log.last();
    const ms = at.sinceStart.milliseconds;
    if (!Number.isInteger(ms) || (previous !== undefined && at.isBefore(previous.at))) {
        const last = previous?.at.sinceStart.milliseconds ?? 0;
        throw new RangeError(`Cannot log at ${ms}: the last entry is at ${last}.`);
    }
}

function causeOf(log: List<LogEntry>, causedBy: LogSequence | undefined): LogEntry | undefined {
    if (causedBy === undefined) {
        return undefined;
    }
    const cause = log.get(causedBy);
    if (cause === undefined) {
        throw new RangeError(`Unknown cause: ${causedBy}.`);
    }
    return cause;
}

/**
 * Adds an entry to a run's record, which is ordered: the record, at a time, caused by an earlier
 * entry or by nothing. Entries are never changed or removed.
 */
export function appendEntry<TRecord extends ILogRecord>(
    log: List<LogEntry<TRecord>>,
    at: IInstant,
    record: TRecord,
    causedBy: LogSequence | undefined,
): List<LogEntry<TRecord>> {
    const sequence = toLogSequence(log.size);
    assertInOrder(log, at);
    const cause = causeOf(log, causedBy);
    const entry: LogEntry<TRecord> = Object.freeze({
        ...record,
        sequence,
        at,
        causedBy: cause?.sequence ?? null,
        trace: cause?.trace ?? sequence,
    });
    return log.push(entry);
}
