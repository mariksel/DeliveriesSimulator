import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { OrderRefusal } from '../../domain/orders/order-refusal';
import { ScriptRefusal } from './command-outcome';
import {
    commandIssued,
    commandRefused,
    configChanged,
    deliveriesEvent,
    deliveriesOutbox,
    entryOf,
    inboxRead,
    indirectEffectHappened,
    notificationSent,
    orderCreated,
    ordersEvent,
    ordersOutbox,
} from './run-log-entries.testing';
import type { RunLogEntry, RunLogRecord } from './run-log-entry';
import { runLogEntriesEqual, runLogEntryPart } from './run-log-entry-digest';
import { IGNORED, LATE, REFUSED } from './indirect-effects.testing';

/** One of each kind of record, with every field that may be null given a value too. */
const RECORDS: readonly [string, RunLogRecord][] = [
    ['an order created', orderCreated()],
    ['an order created with a driver', orderCreated({ driverId: 'driver' as never })],
    ['an orders event', ordersEvent()],
    [
        'an orders event with a driver and a match',
        ordersEvent({ driverId: 'driver' as never, deliveriesEventId: 'match' as never }),
    ],
    ['an orders outbox event', ordersOutbox()],
    [
        'an orders outbox event with a driver and a start',
        ordersOutbox({ driverId: 'driver' as never, startedEventId: 'start' as never }),
    ],
    ['an inbox read', inboxRead('deliveries', 'orders-outbox')],
    ['a deliveries event', deliveriesEvent()],
    [
        'a deliveries event with a driver and a match',
        deliveriesEvent({ driverId: 'driver' as never, ordersEventId: 'match' as never }),
    ],
    ['a deliveries outbox event', deliveriesOutbox()],
    ['a deliveries outbox event with a driver', deliveriesOutbox({ driverId: 'driver' as never })],
    ['a notification sent', notificationSent()],
    ['a command issued', commandIssued('accept')],
    ['a command refused by the script', commandRefused('accept', ScriptRefusal.UnknownOrder)],
    [
        'a command refused by orders, through deliveries',
        commandRefused('pick-up', { orders: OrderRefusal.NotReady }),
    ],
    ['a config change', configChanged()],
    ['a driver ignoring a request', indirectEffectHappened(IGNORED)],
    ['a restaurant running late', indirectEffectHappened(LATE)],
    ['a customer not taking an order', indirectEffectHappened(REFUSED)],
];

const SAMPLES: readonly [string, RunLogEntry][] = RECORDS.flatMap(([name, record]) => [
    [name, entryOf(3, record, { at: 7, trace: 2 })],
    [`${name}, with a cause`, entryOf(3, record, { at: 7, causedBy: 1, trace: 2 })],
]);

/** A list's items are its fields, by their place in it, as a digest writes them out in order. */
const isList = (value: unknown): value is List<unknown> => List.isList(value);

/** The path to every leaf value of an entry, except its source and kind, which pick its type. */
function leafPaths(value: unknown, path: readonly string[] = []): (readonly string[])[] {
    if (value === null || typeof value !== 'object') {
        return [path];
    }
    if (isList(value)) {
        return value.toArray().flatMap((item, index) => leafPaths(item, [...path, String(index)]));
    }
    return Object.entries(value).flatMap(([key, child]) =>
        path.length === 0 && (key === 'source' || key === 'kind')
            ? []
            : leafPaths(child, [...path, key]),
    );
}

/** Another value of a leaf: a number on, text longer, a boolean flipped, a null given text. */
function changedLeaf(leaf: unknown): unknown {
    if (typeof leaf === 'number') {
        return leaf + 1;
    }
    if (typeof leaf === 'string') {
        return `${leaf}x`;
    }
    if (typeof leaf === 'boolean') {
        return !leaf;
    }
    return 'x';
}

/** A shallow copy of a record that keeps its class, so its methods still work. */
function sameClassCopy(record: object, changes: Record<string, unknown> = {}): object {
    const prototype: unknown = Object.getPrototypeOf(record);
    const copy = Object.create(prototype as object | null) as object;
    return Object.assign(copy, record, changes);
}

/** A copy of a value with the leaf at a path changed, sharing nothing it changed. */
function withLeafChanged(value: unknown, path: readonly string[]): unknown {
    const [key, ...rest] = path;
    if (key === undefined) {
        return changedLeaf(value);
    }
    if (isList(value)) {
        const index = Number(key);
        const item = value.get(index);
        const changed = withLeafChanged(item, rest);
        return value.set(index, changed);
    }
    const record = value as Record<string, unknown>;
    const changed = withLeafChanged(record[key], rest);
    return sameClassCopy(record, { [key]: changed });
}

/** Every sample with one leaf changed, named by the sample and the leaf. */
const CHANGED: readonly [string, RunLogEntry, RunLogEntry][] = SAMPLES.flatMap(([name, entry]) =>
    leafPaths(entry).map((path): [string, RunLogEntry, RunLogEntry] => [
        `${name}: ${path.join('.')}`,
        entry,
        withLeafChanged(entry, path) as RunLogEntry,
    ]),
);

/** A deep copy that shares no object with the entry, so equality cannot rest on identity. */
function deepCopy(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    if (isList(value)) {
        const items = value.toArray().map(deepCopy);
        return List(items);
    }
    const fields = Object.entries(value).map(([key, child]): [string, unknown] => [
        key,
        deepCopy(child),
    ]);
    const changes = Object.fromEntries(fields);
    return sameClassCopy(value, changes);
}

const copyOf = (entry: RunLogEntry): RunLogEntry => deepCopy(entry) as RunLogEntry;

describe("writing out a log entry for the run's digest", () => {
    it.each(SAMPLES)('writes the same entry out the same way: %s', (_name, entry) => {
        const copy = copyOf(entry);

        const written = runLogEntryPart(entry);
        const copyWritten = runLogEntryPart(copy);
        expect(copyWritten).toBe(written);
    });

    it.each(CHANGED)('writes out every field: %s', (_name, entry, changed) => {
        const written = runLogEntryPart(entry);
        const changedWritten = runLogEntryPart(changed);
        expect(changedWritten).not.toBe(written);
    });

    it('writes out entries of different kinds differently', () => {
        const parts = SAMPLES.map(([, entry]) => runLogEntryPart(entry));

        const distinct = new Set(parts);
        expect(distinct.size).toBe(SAMPLES.length);
    });

    it('keeps text from running into the field after it', () => {
        const firstRecord = commandIssued('accept', 'A', 'B,C');
        const secondRecord = commandIssued('accept', 'A,B', 'C');
        const first = entryOf(0, firstRecord);
        const second = entryOf(0, secondRecord);

        const firstWritten = runLogEntryPart(first);
        const secondWritten = runLogEntryPart(second);
        expect(firstWritten).not.toBe(secondWritten);
    });
});

describe('comparing two log entries by their typed fields', () => {
    it.each(SAMPLES)('finds an entry equal to a copy of it: %s', (_name, entry) => {
        const copy = copyOf(entry);

        const isEqual = runLogEntriesEqual(entry, copy);
        expect(isEqual).toBe(true);
    });

    it.each(CHANGED)('notices every field: %s', (_name, entry, changed) => {
        const isEqual = runLogEntriesEqual(entry, changed);
        const isEqualBackwards = runLogEntriesEqual(changed, entry);
        expect(isEqual).toBe(false);
        expect(isEqualBackwards).toBe(false);
    });

    it('finds entries of different kinds different', () => {
        const pairs = SAMPLES.flatMap(([, first], index) =>
            SAMPLES.filter((_sample, other) => other !== index).map(([, second]) =>
                runLogEntriesEqual(first, second),
            ),
        );

        const isAnyEqual = pairs.some(Boolean);
        expect(isAnyEqual).toBe(false);
    });
});

describe('the digest and the comparison', () => {
    it('never disagree: two entries are equal exactly when they are written out the same', () => {
        const entries = [
            ...SAMPLES.map(([, entry]) => entry),
            ...SAMPLES.map(([, entry]) => copyOf(entry)),
            ...CHANGED.map(([, , changed]) => changed),
        ];

        const written = entries.map((entry) => ({ entry, part: runLogEntryPart(entry) }));

        const disagreements = written.flatMap((first) =>
            written.filter((second) => {
                const isEqual = runLogEntriesEqual(first.entry, second.entry);
                const isWrittenTheSame = first.part === second.part;
                return isEqual !== isWrittenTheSame;
            }),
        );

        expect(disagreements).toEqual([]);
    });
});
