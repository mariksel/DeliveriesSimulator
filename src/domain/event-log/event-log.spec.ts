import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import { appendEntry } from './event-log';
import type { ILogRecord, LogEntry } from './log-entry';
import { toLogSequence } from './numbers';
import { instantAt } from '../system/time/instant.testing';

/** Holds a log for a test, as the engine would. */
class TestLog {
    log = List<LogEntry>();

    get entries(): LogEntry[] {
        return this.log.toArray();
    }

    append(at: number, kind = 'OrderCreated', causedBy?: number, source = 'orders'): LogEntry {
        const record = recordOf(kind, source);
        const cause = causedBy === undefined ? undefined : toLogSequence(causedBy);
        const secondAt = instantAt(at);
        this.log = appendEntry(this.log, secondAt, record, cause);
        return this.log.last()!;
    }
}

const recordOf = (kind = 'OrderCreated', source = 'orders'): ILogRecord => ({
    source,
    kind,
    data: { id: 'order-1' },
});

describe('EventLog', () => {
    it('leaves the log it was given as it was', () => {
        const log = List<LogEntry>();
        const record = recordOf();
        const at = instantAt(0);
        const start = appendEntry(log, at, record, undefined);

        const secondAt = instantAt(0);
        const longer = appendEntry(start, secondAt, record, undefined);

        expect(start.size).toBe(1);
        expect(longer.size).toBe(2);
    });

    it('numbers entries in the order they arrive, with their time', () => {
        const log = new TestLog();

        log.append(5, 'First');
        log.append(5, 'Second');
        log.append(9, 'Third');

        const map = log.entries.map((entry) => [entry.sequence, entry.at, entry.kind]);
        expect(map).toEqual([
            [0, 5, 'First'],
            [1, 5, 'Second'],
            [2, 9, 'Third'],
        ]);
    });

    it('keeps the record it was given, with its data', () => {
        const record = recordOf();
        const log = List<LogEntry>();

        const at = instantAt(0);
        const logged = appendEntry(log, at, record, undefined);

        const added = logged.first();
        expect(added).toMatchObject(record);
        expect(added?.data).toBe(record.data);
    });

    it('starts a new trace when nothing caused an entry', () => {
        const log = new TestLog();

        const first = log.append(0);
        const second = log.append(0);

        expect(first).toMatchObject({ causedBy: null, trace: 0 });
        expect(second).toMatchObject({ causedBy: null, trace: 1 });
    });

    it('carries the trace along a chain of causes, across modules', () => {
        const log = new TestLog();
        const command = log.append(0, 'A');
        const other = log.append(0, 'B');
        const outbox = log.append(0, 'C', command.sequence);
        const inbox = log.append(0, 'D', outbox.sequence, 'deliveries');

        expect(outbox).toMatchObject({ causedBy: 0, trace: 0 });
        expect(inbox).toMatchObject({ causedBy: 2, trace: 0 });
        expect(other.trace).toBe(1);
    });

    it('refuses an unknown cause, including one that has not happened yet', () => {
        const log = new TestLog();
        log.append(0);

        expect(() => log.append(0, 'OrderCreated', 1)).toThrow(RangeError);
        expect(() => log.append(0, 'OrderCreated', -1)).toThrow(RangeError);
        expect(log.entries).toHaveLength(1);
    });

    it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY])('refuses a time of %s', (at) => {
        expect(() => new TestLog().append(at)).toThrow(RangeError);
    });

    it('refuses a time before the last entry', () => {
        const log = new TestLog();
        log.append(10);

        expect(() => log.append(9)).toThrow(RangeError);
    });

    it('says when the last entry was, when it refuses a time', () => {
        const log = new TestLog();
        log.append(10);

        expect(() => log.append(9)).toThrow('Cannot log at 9: the last entry is at 10.');
    });

    it('freezes an entry, as history cannot change', () => {
        const added = new TestLog().append(0);

        expect(() => {
            (added as { kind: string }).kind = 'Changed';
        }).toThrow(TypeError);
    });
});
