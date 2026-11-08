import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { appendEntry } from '../../domain/event-log/event-log';
import type {
    RunLogEntry,
    RunLogRecord,
} from '../../application-core/simulation-engine/run-log-entry';
import type { IOutboxRecord } from './inspector-views';
import {
    formatWait,
    inspectorRow,
    inspectorTables,
    InspectorMode,
    outboxRecords,
} from './inspector-views';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

/** An entry built loosely, as these tests do not care about every field of its data. */
interface ILooseEntry {
    readonly at: number;
    readonly source: string;
    readonly kind: string;
    readonly data: unknown;
    readonly causedBy?: number | undefined;
}

/** Logs a loosely built entry as a run's typed entry. */
function looseAppend(log: List<RunLogEntry>, entry: ILooseEntry): List<RunLogEntry> {
    const at = toSimTime(entry.at);
    const causedBy = entry.causedBy === undefined ? undefined : toLogSequence(entry.causedBy);
    return appendEntry(
        log,
        at,
        { source: entry.source, kind: entry.kind, data: entry.data } as RunLogRecord,
        causedBy,
    );
}

function logOf(...entries: ILooseEntry[]): List<RunLogEntry> {
    const logEntries = List<RunLogEntry>();
    return entries.reduce<List<RunLogEntry>>((log, entry) => looseAppend(log, entry), logEntries);
}

const written = (source: string, id: string, at: number): ILooseEntry => ({
    at,
    source,
    kind: 'OutboxEventWritten',
    data: { id, kind: 'OrderReady', orderId: 'order-1' },
});

const read = (
    source: string,
    outboxEventId: string,
    at: number,
    causedBy?: number,
): ILooseEntry => ({
    at,
    source,
    kind: 'InboxEventRead',
    data: { outboxEventId },
    causedBy,
});

const RECORD: IOutboxRecord = {
    sequence: 0,
    source: 'orders',
    id: 'orders-outbox-1',
    kind: 'OrderReady',
    order: 'order-1',
    writtenAt: 1000,
    readSequence: null,
    readAt: null,
};

describe('what the log says about each outbox event', () => {
    it('finds an event written, and waiting', () => {
        const newLogEntry = written('orders', 'o-1', 1000);
        const log = logOf(newLogEntry);
        const records = outboxRecords(log);

        expect(records).toEqual([
            {
                sequence: 0,
                source: 'orders',
                id: 'o-1',
                kind: 'OrderReady',
                order: 'order-1',
                writtenAt: 1000,
                readSequence: null,
                readAt: null,
            },
        ]);
    });

    it('finds where the other module read it', () => {
        const newLogEntry = written('orders', 'o-1', 1000);
        const secondNewLogEntry = read('deliveries', 'o-1', 5000, 0);
        const log = logOf(newLogEntry, secondNewLogEntry);
        const records = outboxRecords(log);

        expect(records[0]).toMatchObject({ readSequence: 1, readAt: 5000 });
    });

    it('does not take a read by the module that wrote it', () => {
        const newLogEntry = written('orders', 'o-1', 1000);
        const secondNewLogEntry = read('orders', 'o-1', 5000);
        const log = logOf(newLogEntry, secondNewLogEntry);
        const records = outboxRecords(log);

        expect(records[0]?.readAt).toBeNull();
    });

    it('takes the first read, if there are several', () => {
        const newLogEntry = written('orders', 'o-1', 1000);
        const secondNewLogEntry = read('deliveries', 'o-1', 5000);
        const thirdNewLogEntry = read('deliveries', 'o-1', 6000);
        const log = logOf(newLogEntry, secondNewLogEntry, thirdNewLogEntry);
        const records = outboxRecords(log);

        expect(records[0]).toMatchObject({ readSequence: 1, readAt: 5000 });
    });

    it('reads a deliveries event read by orders, too', () => {
        const newLogEntry = written('deliveries', 'd-1', 1000);
        const secondNewLogEntry = read('orders', 'd-1', 5000);
        const log = logOf(newLogEntry, secondNewLogEntry);
        const records = outboxRecords(log);

        expect(records[0]?.readAt).toBe(5000);
    });

    it('shows each moment truly: an event read later is still waiting before then', () => {
        const newLogEntry = written('orders', 'o-1', 1000);
        const secondNewLogEntry = read('deliveries', 'o-1', 5000);
        const log = logOf(newLogEntry, secondNewLogEntry);

        const take = log.take(1);
        const before = outboxRecords(take);

        expect(before[0]?.readAt).toBeNull();
    });
});

describe('the tables', () => {
    const newLogEntry = written('orders', 'o-1', 1000);
    const secondNewLogEntry = written('orders', 'o-2', 2000);
    const thirdNewLogEntry = written('deliveries', 'd-1', 3000);
    const fourthNewLogEntry = read('orders', 'd-1', 5000);
    const fifthNewLogEntry = read('deliveries', 'o-2', 6000);
    const log = logOf(
        newLogEntry,
        secondNewLogEntry,
        thirdNewLogEntry,
        fourthNewLogEntry,
        fifthNewLogEntry,
    );
    const records = outboxRecords(log);

    it('by flow, shows each direction, with its counts', () => {
        const tables = inspectorTables(records, InspectorMode.ByFlow);

        const secondTables = tables.map((table) => [table.title, table.counts]);
        expect(secondTables).toEqual([
            ['Orders to deliveries', '2 written, 1 read, 1 waiting'],
            ['Deliveries to orders', '1 written, 1 read, 0 waiting'],
        ]);
    });

    it('by flow, shows the times written and read', () => {
        const [first] = inspectorTables(records, InspectorMode.ByFlow);

        expect(first?.columns).toBe('WrittenAndRead');
        const secondRecords = first?.records.map((record) => record.id);
        expect(secondRecords).toEqual(['o-1', 'o-2']);
    });

    it('by module, shows each outbox and inbox, with its counts', () => {
        const tables = inspectorTables(records, InspectorMode.ByModule);

        const secondTables = tables.map((table) => [table.title, table.counts]);
        expect(secondTables).toEqual([
            ['Orders outbox', '2 written, 1 waiting'],
            ['Orders inbox', '1 read'],
            ['Deliveries outbox', '1 written, 0 waiting'],
            ['Deliveries inbox', '1 read'],
        ]);
    });

    it("by module, puts in each inbox what it read of the other module's outbox", () => {
        const tables = inspectorTables(records, InspectorMode.ByModule);

        const secondRecords = tables[1]?.records.map((record) => record.id);
        expect(secondRecords).toEqual(['d-1']);
        const thirdRecords = tables[3]?.records.map((record) => record.id);
        expect(thirdRecords).toEqual(['o-2']);
    });

    it('by module, lists an inbox in the order it read them', () => {
        const newLogEntry = written('orders', 'o-1', 1000);
        const secondNewLogEntry = written('orders', 'o-2', 1000);
        const thirdNewLogEntry = read('deliveries', 'o-2', 2000);
        const fourthNewLogEntry = read('deliveries', 'o-1', 3000);
        const log = logOf(newLogEntry, secondNewLogEntry, thirdNewLogEntry, fourthNewLogEntry);

        const secondOutboxRecords = outboxRecords(log);
        const tables = inspectorTables(secondOutboxRecords, InspectorMode.ByModule);

        const secondRecords = tables[3]?.records.map((record) => record.id);
        expect(secondRecords).toEqual(['o-2', 'o-1']);
    });

    it('by module, shows only the time that matters in each', () => {
        const tables = inspectorTables(records, InspectorMode.ByModule);

        const secondTables = tables.map((table) => table.columns);
        expect(secondTables).toEqual(['Written', 'Read', 'Written', 'Read']);
    });
});

describe('a row at this moment', () => {
    it('shows how long an unread event has been waiting so far', () => {
        const row = inspectorRow(RECORD, 6000);

        expect(row).toMatchObject({ read: null, waited: '5 s', isWaiting: true });
    });

    it('shows how long a read event waited, whatever the time now', () => {
        const row = inspectorRow({ ...RECORD, readSequence: 1, readAt: 3000 }, 99_000);

        expect(row).toMatchObject({ read: 'h00:m00:s03:ms00', waited: '2 s', isWaiting: false });
    });

    it('shows when it was written', () => {
        expect(inspectorRow(RECORD, 1000).written).toBe('h00:m00:s01:ms00');
    });

    it.each<[number, string]>([
        [0, '0 ms'],
        [999, '999 ms'],
        [1000, '1 s'],
        [59_999, '59 s'],
        [60_000, '1 m 0 s'],
        [65_000, '1 m 5 s'],
        [3_600_000, '60 m 0 s'],
    ])('writes %i ms of waiting as %s', (ms, text) => {
        const secondFormatWait = formatWait(ms);
        expect(secondFormatWait).toBe(text);
    });
});
