import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { appendEntry } from '../../domain/event-log/event-log';
import type {
    RunLogEntry,
    RunLogRecord,
} from '../../application-core/simulation-engine/run-log-entry';
import { eventRow, payloadView } from './event-views';
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

const entry = (kind: string, data: unknown, causedBy?: number): ILooseEntry => ({
    at: 65_000,
    source: 'orders',
    kind,
    data,
    causedBy,
});

describe('a row of the event list', () => {
    it('shows what the log says about the entry', () => {
        const newLogEntry = entry('OrderReady', { event: { orderId: 'order-1' } });
        const log = logOf(newLogEntry);

        const secondEventRow = eventRow(log.get(0)!, log);
        expect(secondEventRow).toEqual({
            sequence: 0,
            time: 'h00:m01:s05:ms00',
            source: 'orders',
            kind: 'OrderReady',
            order: 'order-1',
            causedBy: null,
        });
    });

    it('shows what caused it', () => {
        const newLogEntry = entry('First', null);
        const secondNewLogEntry = entry('Second', null, 0);
        const log = logOf(newLogEntry, secondNewLogEntry);

        expect(eventRow(log.get(1)!, log).causedBy).toBe(0);
    });

    it.each<[string, unknown, string]>([
        ['a created order, by its ID', { id: 'order-1' }, 'OrderCreated'],
        [
            'a command, as the scenario names it',
            { actor: 'r', name: 'x', data: { order: 'A' } },
            'CommandIssued',
        ],
    ])('shows the order of %s', (_name, data, kind) => {
        const newLogEntry = entry(kind, data);
        const log = logOf(newLogEntry);

        expect(eventRow(log.get(0)!, log).order).toMatch(/order-1|A/);
    });

    it('finds the order through what caused an entry, such as an inbox read', () => {
        const newLogEntry = entry('OutboxEventWritten', { orderId: 'order-1' });
        const secondNewLogEntry = entry('InboxEventRead', { outboxEventId: 'x' }, 0);
        const log = logOf(newLogEntry, secondNewLogEntry);

        expect(eventRow(log.get(1)!, log).order).toBe('order-1');
    });

    it('finds the order through a chain of causes', () => {
        const newLogEntry = entry('OrderReady', { event: { orderId: 'order-1' } });
        const secondNewLogEntry = entry('InboxEventRead', { outboxEventId: 'x' }, 0);
        const thirdNewLogEntry = entry('NotificationSent', { id: 'n' }, 1);
        const log = logOf(newLogEntry, secondNewLogEntry, thirdNewLogEntry);

        expect(eventRow(log.get(2)!, log).order).toBe('order-1');
    });

    it('leaves the order blank when the log does not say', () => {
        const newLogEntry = entry('A', 'plain text');
        const log = logOf(newLogEntry);

        expect(eventRow(log.get(0)!, log).order).toBe('');
    });
});

describe('what the Payload viewer shows', () => {
    it("shows the entry's own facts", () => {
        const newLogEntry = entry('A', null);
        const secondNewLogEntry = entry('B', null, 0);
        const log = logOf(newLogEntry, secondNewLogEntry);

        const secondPayloadView = payloadView(log.get(1)!);
        expect(secondPayloadView).toMatchObject({
            sequence: 1,
            kind: 'B',
            time: 'h00:m01:s05:ms00',
            source: 'orders',
            causedBy: 0,
            trace: 0,
        });
    });

    it('shows the data exactly as stored, indented', () => {
        const newLogEntry = entry('A', { orderId: 'order-1', lines: [1] });
        const log = logOf(newLogEntry);

        const { json } = payloadView(log.get(0)!);

        const parsed: unknown = JSON.parse(json);
        expect(parsed).toEqual({ orderId: 'order-1', lines: [1] });
        expect(json).toContain('\n  "orderId"');
    });
});
