import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import { OrderEventKind } from '../../domain/orders/order-event-kind';
import { firstDifference } from './compare-runs';
import {
    commandIssued,
    deliveriesEvent,
    logOf,
    orderCreated,
    ordersEvent,
} from './run-log-entries.testing';
import type { RunLogEntry, RunLogRecord } from './run-log-entry';

const CREATED = orderCreated();
const READY = ordersEvent({ kind: OrderEventKind.OrderReady });
const DELIVERED = ordersEvent();
const DELIVERIES_EVENT = deliveriesEvent();
const LATER_VERSION = ordersEvent({ version: 2 });
const ISSUED = commandIssued('accept');

/** A log of these records, all at time 0 and caused by nothing. */
function plainLog(...records: readonly RunLogRecord[]): List<RunLogEntry> {
    const timed = records.map((record) => [0, record] as const);
    return logOf(...timed);
}

describe('firstDifference', () => {
    it('finds none between matching runs', () => {
        const log = plainLog(CREATED, DELIVERED);
        const second = plainLog(CREATED, DELIVERED);

        const runDifference = firstDifference(log, second);
        expect(runDifference).toBeNull();
        const empty = List<RunLogEntry>();
        const otherEmpty = List<RunLogEntry>();
        const emptyDifference = firstDifference(empty, otherEmpty);
        expect(emptyDifference).toBeNull();
    });

    it.each<[string, List<RunLogEntry>]>([
        ['time', logOf([0, CREATED], [5, DELIVERED])],
        ['source', plainLog(CREATED, DELIVERIES_EVENT)],
        ['kind', plainLog(CREATED, READY)],
        ['data', plainLog(CREATED, LATER_VERSION)],
        ['cause', logOf([0, CREATED], [0, DELIVERED, 0])],
    ])('notices a different %s', (_field, second) => {
        const first = plainLog(CREATED, DELIVERED);

        const difference = firstDifference(first, second);

        expect(difference?.sequence).toBe(1);
        const expected = first.get(1);
        expect(difference?.first).toEqual(expected);
        const secondSecond = second.get(1);
        expect(difference?.second).toEqual(secondSecond);
    });

    it('reports the first difference, not a later one', () => {
        const log = plainLog(CREATED, READY, DELIVERED);
        const second = plainLog(CREATED, DELIVERED, READY);

        const difference = firstDifference(log, second);

        expect(difference?.sequence).toBe(1);
        expect(difference?.first?.kind).toBe(OrderEventKind.OrderReady);
    });

    it('notices when one run ends early, either way round', () => {
        const short = plainLog(CREATED);
        const long = plainLog(CREATED, ISSUED);

        const runDifference = firstDifference(short, long);
        expect(runDifference).toEqual({
            sequence: 1,
            first: null,
            second: long.get(1),
        });
        const secondRunDifference = firstDifference(long, short);
        expect(secondRunDifference).toEqual({
            sequence: 1,
            first: long.get(1),
            second: null,
        });
    });
});
