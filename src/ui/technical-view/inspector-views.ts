import type { List } from 'immutable';

import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';
import {
    isInboxRead,
    isOutboxEntry,
} from '../../application-core/simulation-engine/run-log-entry';
import { LogSource } from '../../domain/event-log/log-vocabulary';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import type { IColumn } from './column-widths';
import { orderOf } from '../../application-core/simulation-engine/run-log-entry-order';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** How the inspector arranges its records. */
export const InspectorMode = {
    /** Each direction of communication, with each event's writing and reading on one row. */
    ByFlow: 'ByFlow',
    /** Each module's outbox and inbox, as they are stored. */
    ByModule: 'ByModule',
} as const;

/** One of the values of {@link InspectorMode}. */
export type InspectorMode = (typeof InspectorMode)[keyof typeof InspectorMode];

/** Which times a table of records has columns for. */
export const InspectorColumns = {
    WrittenAndRead: 'WrittenAndRead',
    Written: 'Written',
    Read: 'Read',
} as const;

/** One of the values of {@link InspectorColumns}. */
export type InspectorColumns = (typeof InspectorColumns)[keyof typeof InspectorColumns];

const BY_FLOW_GROUP = 'inspector-by-flow';
const BY_MODULE_GROUP = 'inspector-by-module';

const BY_FLOW_COLUMNS: readonly IColumn[] = [
    { key: 'id', label: 'Outbox event', startPx: 120 },
    { key: 'kind', label: 'Kind', startPx: 200 },
    { key: 'order', label: 'Order', startPx: 50 },
    { key: 'written', label: 'Written', startPx: 104 },
    { key: 'read', label: 'Read', startPx: 104 },
    { key: 'waited', label: 'Waited', startPx: 50 },
];

/** By module, the written and read times share a key, so the four tables stay lined up. */
const byModuleColumns = (time: string): readonly IColumn[] => [
    { key: 'id', label: 'Outbox event', startPx: 60 },
    { key: 'kind', label: 'Kind', startPx: 76 },
    { key: 'order', label: 'Order', startPx: 46 },
    { key: 'time', label: time, startPx: 104 },
    { key: 'waited', label: 'Waited', startPx: 40 },
];

/** The columns of a table showing these times. */
export function columnsOf(columns: InspectorColumns): readonly IColumn[] {
    if (columns === InspectorColumns.WrittenAndRead) {
        return BY_FLOW_COLUMNS;
    }
    return byModuleColumns(columns === InspectorColumns.Written ? 'Written' : 'Read');
}

/** The group of tables that share their column widths: all those of one view. */
export const columnGroupOf = (columns: InspectorColumns): string =>
    columns === InspectorColumns.WrittenAndRead ? BY_FLOW_GROUP : BY_MODULE_GROUP;

/** One outbox event, and what became of it, as the log shows. */
export interface IOutboxRecord {
    /** The sequence number of the entry that wrote it. */
    readonly sequence: number;
    readonly source: string;
    readonly id: string;
    readonly kind: string;
    readonly order: string;
    readonly writtenAt: number;
    /** The sequence number of the entry that read it, or null while it is waiting. */
    readonly readSequence: number | null;
    readonly readAt: number | null;
}

/** One table of records. */
export interface IInspectorTable {
    readonly title: string;
    readonly counts: string;
    readonly columns: InspectorColumns;
    readonly records: readonly IOutboxRecord[];
}

/** One row of a table, as it shows at this moment. */
export interface IInspectorRow {
    readonly id: string;
    readonly kind: string;
    readonly order: string;
    readonly written: string;
    readonly read: string | null;
    readonly waited: string;
    readonly isWaiting: boolean;
}

/** Every outbox event in a log, oldest first, with where the other module read it. */
export function outboxRecords(entries: List<RunLogEntry>): readonly IOutboxRecord[] {
    const reverse = entries
        .filter(isInboxRead)
        .map((entry): readonly [string, RunLogEntry] => [
            `${entry.source}|${entry.data.outboxEventId}`,
            entry,
        ])
        .reverse();
    const reads = new Map(reverse);
    return entries
        .filter(isOutboxEntry)
        .map((entry) => {
            const { id } = entry.data;
            const read = reads.get(`${readerOf(entry.source)}|${id}`);
            return {
                sequence: entry.sequence,
                source: entry.source,
                id,
                kind: entry.data.kind,
                order: orderOf(entry, entries),
                writtenAt: entry.at.sinceStart.milliseconds,
                readSequence: read?.sequence ?? null,
                readAt: read === undefined ? null : read.at.sinceStart.milliseconds,
            };
        })
        .toArray();
}

function readerOf(source: string): string {
    return source === LogSource.Orders ? LogSource.Deliveries : LogSource.Orders;
}

const isRead = (record: IOutboxRecord): boolean => record.readSequence !== null;

function flowTable(title: string, records: readonly IOutboxRecord[]): IInspectorTable {
    const read = records.filter(isRead).length;
    return {
        title,
        counts: `${records.length} written, ${read} read, ${records.length - read} waiting`,
        columns: InspectorColumns.WrittenAndRead,
        records,
    };
}

function outboxTable(title: string, records: readonly IOutboxRecord[]): IInspectorTable {
    const waiting = records.filter((record) => !isRead(record)).length;
    return {
        title,
        counts: `${records.length} written, ${waiting} waiting`,
        columns: InspectorColumns.Written,
        records,
    };
}

function inboxTable(title: string, written: readonly IOutboxRecord[]): IInspectorTable {
    const records = written
        .filter(isRead)
        .toSorted((first, second) => (first.readSequence ?? 0) - (second.readSequence ?? 0));
    return { title, counts: `${records.length} read`, columns: InspectorColumns.Read, records };
}

/** The tables to show for a way of arranging the records. */
export function inspectorTables(
    records: readonly IOutboxRecord[],
    mode: InspectorMode,
): readonly IInspectorTable[] {
    const fromOrders = records.filter((record) => record.source === LogSource.Orders);
    const fromDeliveries = records.filter((record) => record.source === LogSource.Deliveries);
    return mode === InspectorMode.ByFlow
        ? [
              flowTable('Orders to deliveries', fromOrders),
              flowTable('Deliveries to orders', fromDeliveries),
          ]
        : [
              outboxTable('Orders outbox', fromOrders),
              inboxTable('Orders inbox', fromDeliveries),
              outboxTable('Deliveries outbox', fromDeliveries),
              inboxTable('Deliveries inbox', fromOrders),
          ];
}

/** Writes a length of simulated time for people: 800 ms, 45 s, or 1 m 5 s. */
export function formatWait(ms: number): string {
    if (ms < MS_PER_SECOND) {
        return `${ms} ms`;
    }
    const totalSeconds = Math.floor(ms / MS_PER_SECOND);
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return minutes === 0 ? `${seconds} s` : `${minutes} m ${seconds} s`;
}

/** What a record shows at this moment: how long it waited, or has been waiting so far. */
export const inspectorRow = (record: IOutboxRecord, now: number): IInspectorRow => ({
    id: record.id,
    kind: record.kind,
    order: record.order,
    written: formatClockTime(record.writtenAt),
    read: record.readAt === null ? null : formatClockTime(record.readAt),
    waited: formatWait((record.readAt ?? now) - record.writtenAt),
    isWaiting: record.readAt === null,
});
