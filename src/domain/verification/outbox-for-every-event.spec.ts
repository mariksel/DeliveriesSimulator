import { describe, expect, it } from 'vitest';

import { outboxForEveryEvent } from './outbox-for-every-event';
import {
    eventInDeliveries,
    eventInOrders,
    outboxInDeliveries,
    outboxInOrders,
    runRecord,
} from './run-record.testing';
import { toOrderEventId } from '../orders/order-event-id';
import { toLogSequence } from '../event-log/numbers';

const REQUEST = 'OrderDeliveryRequest';

const violation = (sequence: number, message: string): object => ({
    criterion: 'Outbox for every event',
    sequence,
    message,
});

describe('Outbox for every event', () => {
    it('accepts events that each wrote one outbox event in their own module', () => {
        const run = runRecord({
            events: [eventInOrders('in-orders'), eventInDeliveries('in-deliveries')],
            outbox: [
                outboxInOrders('orders-outbox', { eventId: toOrderEventId('in-orders') }),
                outboxInDeliveries('deliveries-outbox', {
                    eventId: toOrderEventId('in-deliveries'),
                }),
            ],
        });

        const violations = outboxForEveryEvent(run).toArray();
        expect(violations).toEqual([]);
    });

    it('reports an event that wrote no outbox event, at that event', () => {
        const run = runRecord({
            events: [eventInOrders('delivered', { sequence: toLogSequence(4) })],
        });

        const violations = outboxForEveryEvent(run).toArray();
        expect(violations).toEqual([violation(4, 'delivered wrote no outbox event in orders.')]);
    });

    it('reports each outbox event after the first, at that outbox event', () => {
        const run = runRecord({
            events: [eventInDeliveries('delivered')],
            outbox: [
                outboxInDeliveries('first', {
                    eventId: toOrderEventId('delivered'),
                    sequence: toLogSequence(1),
                }),
                outboxInDeliveries('second', {
                    eventId: toOrderEventId('delivered'),
                    sequence: toLogSequence(2),
                }),
                outboxInDeliveries('third', {
                    eventId: toOrderEventId('delivered'),
                    sequence: toLogSequence(3),
                }),
            ],
        });

        const violations = outboxForEveryEvent(run).toArray();
        expect(violations).toEqual([
            violation(2, 'delivered wrote more than one outbox event in deliveries.'),
            violation(3, 'delivered wrote more than one outbox event in deliveries.'),
        ]);
    });

    it('reports an outbox event for an event nobody recorded, at that outbox event', () => {
        const run = runRecord({
            outbox: [
                outboxInOrders('stray', {
                    eventId: toOrderEventId('nothing'),
                    sequence: toLogSequence(6),
                }),
            ],
        });

        const violations = outboxForEveryEvent(run).toArray();
        expect(violations).toEqual([
            violation(6, 'stray is for nothing, which was never recorded.'),
        ]);
    });

    it('does not count an outbox event in the other module, even for an event of the same ID', () => {
        const run = runRecord({
            events: [eventInOrders('same-id', { sequence: toLogSequence(1) })],
            outbox: [
                outboxInDeliveries('elsewhere', {
                    eventId: toOrderEventId('same-id'),
                    sequence: toLogSequence(2),
                }),
            ],
        });

        const violations = outboxForEveryEvent(run).toArray();
        expect(violations).toEqual([
            violation(1, 'same-id wrote no outbox event in orders.'),
            violation(2, 'elsewhere is for same-id, which was never recorded.'),
        ]);
    });

    describe('a delivery request, which writes its outbox event once deliveries acknowledges it', () => {
        const request = eventInOrders('request', { kind: REQUEST, sequence: toLogSequence(1) });

        it('needs no outbox event while deliveries has not acknowledged it', () => {
            const run = runRecord({ events: [request] });
            const violations = outboxForEveryEvent(run).toArray();
            expect(violations).toEqual([]);
        });

        it('is not acknowledged by a deliveries event that matches another event', () => {
            const other = eventInDeliveries('other', {
                matchingEventId: toOrderEventId('another'),
            });
            const run = runRecord({
                events: [request, other],
                outbox: [outboxInDeliveries('other-outbox', { eventId: toOrderEventId('other') })],
            });

            const violations = outboxForEveryEvent(run).toArray();
            expect(violations).toEqual([]);
        });

        it('is not acknowledged by an event in its own module', () => {
            const own = eventInOrders('own', { matchingEventId: toOrderEventId('request') });
            const run = runRecord({
                events: [request, own],
                outbox: [outboxInOrders('own-outbox', { eventId: toOrderEventId('own') })],
            });

            const violations = outboxForEveryEvent(run).toArray();
            expect(violations).toEqual([]);
        });

        it('needs its outbox event once deliveries has acknowledged it', () => {
            const acknowledged = eventInDeliveries('acknowledged', {
                matchingEventId: toOrderEventId('request'),
            });
            const run = runRecord({
                events: [request, acknowledged],
                outbox: [
                    outboxInDeliveries('acknowledged-outbox', {
                        eventId: toOrderEventId('acknowledged'),
                    }),
                ],
            });

            const violations = outboxForEveryEvent(run).toArray();
            expect(violations).toEqual([violation(1, 'request wrote no outbox event in orders.')]);
        });

        it('is the only kind excused: any other event in orders needs its outbox event', () => {
            const other = eventInOrders('accepted', {
                kind: 'OrderDeliveryRequestAccepted',
                sequence: toLogSequence(1),
            });

            const run = runRecord({ events: [other] });
            const violations = outboxForEveryEvent(run).toArray();
            expect(violations).toEqual([
                violation(1, 'accepted wrote no outbox event in orders.'),
            ]);
        });

        it('is excused only in orders', () => {
            const inDeliveries = eventInDeliveries('request', {
                kind: REQUEST,
                sequence: toLogSequence(1),
            });

            const run = runRecord({ events: [inDeliveries] });
            const violations = outboxForEveryEvent(run).toArray();
            expect(violations).toEqual([
                violation(1, 'request wrote no outbox event in deliveries.'),
            ]);
        });
    });
});
