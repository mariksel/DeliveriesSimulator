import { describe, expect, it } from 'vitest';

import { exactlyOnceEffect } from './exactly-once-effect';
import {
    eventInDeliveries,
    eventInOrders,
    outboxInDeliveries,
    outboxInOrders,
    readBy,
    runRecord,
} from './run-record.testing';
import { toOrderEventId } from '../orders/order-event-id';
import { toLogSequence } from '../event-log/numbers';

const violation = (sequence: number, message: string): object => ({
    criterion: 'Exactly-once effect',
    sequence,
    message,
});

describe('Exactly-once effect', () => {
    it('accepts outbox events that the other module each read once', () => {
        const run = runRecord({
            outbox: [outboxInOrders('from-orders'), outboxInDeliveries('from-deliveries')],
            reads: [readBy('deliveries', 'from-orders'), readBy('orders', 'from-deliveries')],
        });

        const violations = exactlyOnceEffect(run).toArray();
        expect(violations).toEqual([]);
    });

    it('has nothing to report for an empty run', () => {
        const run = runRecord({});
        const violations = exactlyOnceEffect(run).toArray();
        expect(violations).toEqual([]);
    });

    describe('outbox events', () => {
        it.each([
            ['orders', outboxInOrders('lost', { sequence: toLogSequence(3) })],
            ['deliveries', outboxInDeliveries('lost', { sequence: toLogSequence(3) })],
        ])('reports one from %s that was never read, at the outbox event', (_module, outbox) => {
            const run = runRecord({ outbox: [outbox] });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([
                violation(3, 'lost was lost: the other module never read it.'),
            ]);
        });

        it('does not count a module reading its own outbox event', () => {
            const run = runRecord({
                outbox: [outboxInOrders('own', { sequence: toLogSequence(3) })],
                reads: [readBy('orders', 'own', 5)],
            });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([
                violation(3, 'own was lost: the other module never read it.'),
                violation(5, 'own was read, but never written.'),
            ]);
        });

        it('reports each read after the first, at that read', () => {
            const run = runRecord({
                outbox: [outboxInOrders('twice')],
                reads: [
                    readBy('deliveries', 'twice', 5),
                    readBy('deliveries', 'twice', 6),
                    readBy('deliveries', 'twice', 7),
                ],
            });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([
                violation(6, 'twice was read more than once.'),
                violation(7, 'twice was read more than once.'),
            ]);
        });

        it('reports a read of an event nobody wrote, at that read', () => {
            const run = runRecord({ reads: [readBy('orders', 'nothing', 5)] });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([violation(5, 'nothing was read, but never written.')]);
        });
    });

    describe('events that match one in the other module', () => {
        it('reports a second event matching the same one, at the second', () => {
            const run = runRecord({
                events: [
                    eventInDeliveries('first', {
                        matchingEventId: toOrderEventId('original'),
                        sequence: toLogSequence(1),
                    }),
                    eventInDeliveries('second', {
                        matchingEventId: toOrderEventId('original'),
                        sequence: toLogSequence(2),
                    }),
                ],
            });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([
                violation(2, 'original took effect more than once in deliveries.'),
            ]);
        });

        it('accepts one match in each module, even of the same ID', () => {
            const run = runRecord({
                events: [
                    eventInOrders('in-orders', { matchingEventId: toOrderEventId('same-id') }),
                    eventInDeliveries('in-deliveries', {
                        matchingEventId: toOrderEventId('same-id'),
                    }),
                ],
            });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([]);
        });

        it('accepts events that match different ones', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { matchingEventId: toOrderEventId('first') }),
                    eventInOrders('two', { matchingEventId: toOrderEventId('second') }),
                ],
            });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([]);
        });

        it('does not treat events that match nothing as matching each other', () => {
            const run = runRecord({ events: [eventInOrders('one'), eventInOrders('two')] });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([]);
        });
    });

    describe('an event recorded more than once', () => {
        it('is reported at each repeat', () => {
            const run = runRecord({
                events: [
                    eventInOrders('again', { sequence: toLogSequence(1) }),
                    eventInOrders('again', { sequence: toLogSequence(2) }),
                    eventInOrders('again', { sequence: toLogSequence(3) }),
                ],
            });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([
                violation(2, 'again was recorded more than once in orders.'),
                violation(3, 'again was recorded more than once in orders.'),
            ]);
        });

        it('is only a repeat within one module', () => {
            const run = runRecord({
                events: [eventInOrders('same-id'), eventInDeliveries('same-id')],
            });

            const violations = exactlyOnceEffect(run).toArray();
            expect(violations).toEqual([]);
        });
    });
});
