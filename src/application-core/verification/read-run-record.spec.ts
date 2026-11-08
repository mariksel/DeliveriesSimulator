import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import { deepFrozen } from '../../domain/system/classes/deep-freeze.testing';
import { toDeliveryEventId } from '../../domain/drivers/deliveries/delivery-event-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toOrderEventId } from '../../domain/orders/order-event-id';
import { toOrderId } from '../../domain/orders/order';
import type { IRunRecord } from '../../domain/verification/run-record';
import type { RunLogEntry, RunLogRecord } from '../simulation-engine/run-log-entry';
import {
    commandIssued,
    deliveriesEvent,
    deliveriesOutbox,
    entryOf,
    inboxRead,
    notificationSent,
    orderCreated,
    ordersEvent,
    ordersOutbox,
} from '../simulation-engine/run-log-entries.testing';
import { readRunRecord } from './read-run-record';
import { toVersionNumber } from '../../domain/system/records/version-chain';

const ORDER_A = toOrderId('A');
const ORDER_B = toOrderId('B');

function read(...records: readonly RunLogRecord[]): IRunRecord {
    const entries = records.map((record, sequence): RunLogEntry => entryOf(sequence, record));
    const log = List(entries);
    const frozen = deepFrozen(log);
    return readRunRecord(frozen);
}

describe('reading a run from its typed log', () => {
    describe('events', () => {
        it("reads what an orders event says, matching it by the deliveries event's ID", () => {
            const event = ordersEvent({
                id: toOrderEventId('event'),
                driverId: toDriverId('driver'),
                deliveriesEventId: toDeliveryEventId('theirs'),
            });

            const { events } = read(event);

            const all = events.toArray();
            expect(all).toEqual([
                {
                    sequence: 0,
                    source: 'orders',
                    id: 'event',
                    orderId: 'A',
                    kind: 'OrderDelivered',
                    driverId: 'driver',
                    matchingEventId: 'theirs',
                },
            ]);
        });

        it("matches a deliveries event by the orders event's ID", () => {
            const event = deliveriesEvent({ ordersEventId: toOrderEventId('theirs') });

            const { events } = read(event);

            expect(events.first()?.matchingEventId).toBe('theirs');
        });

        it('leaves out every entry that is not a module event', () => {
            const created = orderCreated();
            const command = commandIssued('create-order');
            const outbox = ordersOutbox();
            const notification = notificationSent();

            const { events } = read(created, command, outbox, notification);

            expect(events.size).toBe(0);
        });
    });

    describe('outbox events', () => {
        it('reads what an orders outbox event says, with the order it carries', () => {
            const outbox = ordersOutbox({
                orderVersion: toVersionNumber(4),
                orderStatus: 'PickedUp',
            });

            const { outbox: written } = read(outbox);

            const first = written.first();
            expect(first).toEqual({
                sequence: 0,
                source: 'orders',
                id: 'orders-outbox',
                eventId: 'order-event',
                orderId: 'A',
                orderVersion: 4,
                orderStatus: 'PickedUp',
            });
        });

        it('has no order version or status for a deliveries outbox event', () => {
            const outbox = deliveriesOutbox();

            const { outbox: written } = read(outbox);

            const first = written.first();
            expect(first).toMatchObject({ orderVersion: null, orderStatus: null });
        });
    });

    describe('inbox reads', () => {
        it('reads which outbox event a module read', () => {
            const reading = inboxRead('deliveries', 'orders-outbox');

            const { reads } = read(reading);

            const all = reads.toArray();
            expect(all).toEqual([
                { sequence: 0, source: 'deliveries', outboxEventId: 'orders-outbox' },
            ]);
        });
    });

    describe("orders' statuses", () => {
        it('knows a new order by its ID', () => {
            const created = orderCreated({ id: toOrderId('B') });

            const { statuses } = read(created);

            const status = statuses.get(ORDER_B);
            expect(status).toEqual({ sequence: 0, status: 'Created' });
        });

        it("reads an orders event's status, and an outbox event's", () => {
            const event = ordersEvent({ status: 'DriverAssigned' });
            const outbox = ordersOutbox({ orderStatus: 'PickedUp' });

            const atEvent = read(event).statuses.get(ORDER_A);
            const atOutbox = read(outbox).statuses.get(ORDER_A);

            expect(atEvent?.status).toBe('DriverAssigned');
            expect(atOutbox?.status).toBe('PickedUp');
        });

        it('keeps the latest of each order, in the order they first appeared', () => {
            const createdA = orderCreated();
            const createdB = orderCreated({ id: toOrderId('B') });
            const delivered = ordersEvent();

            const { statuses } = read(createdA, createdB, delivered);

            const all = statuses.entrySeq().toArray();
            expect(all).toEqual([
                ['A', { sequence: 2, status: 'Delivered' }],
                ['B', { sequence: 1, status: 'Created' }],
            ]);
        });

        it("passes over deliveries' entries, and entries that give no status", () => {
            const event = deliveriesEvent();
            const reading = inboxRead('orders', 'deliveries-outbox');
            const command = commandIssued('create-order');

            const { statuses } = read(event, reading, command);

            expect(statuses.size).toBe(0);
        });
    });
});
