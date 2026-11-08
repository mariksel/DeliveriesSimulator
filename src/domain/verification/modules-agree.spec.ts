import { describe, expect, it } from 'vitest';

import { modulesAgree } from './modules-agree';
import type { ILoggedOutboxEvent } from './run-record';
import {
    eventInDeliveries,
    eventInOrders,
    outboxInDeliveries,
    outboxInOrders,
    readBy,
    runRecord,
} from './run-record.testing';
import type { OrderStatus } from '../orders/order-status';
import { toDriverId } from '../drivers/driver';
import { toOrderId } from '../orders/order';
import { toLogSequence } from '../event-log/numbers';
import { toVersionNumber } from '../system/records/version-chain';

const violation = (sequence: number | null, message: string): object => ({
    criterion: 'Modules agree',
    sequence,
    message,
});

const fromOrders = (
    id: string,
    orderVersion: number | null,
    orderStatus: OrderStatus | null,
    sequence = 0,
): ILoggedOutboxEvent =>
    outboxInOrders(id, {
        orderVersion: orderVersion === null ? null : toVersionNumber(orderVersion),
        orderStatus,
        sequence: toLogSequence(sequence),
    });

describe('Modules agree', () => {
    it('has nothing to report for an empty run', () => {
        const run = runRecord({});
        const violations = modulesAgree(run).toArray();
        expect(violations).toEqual([]);
    });

    describe('events still flowing', () => {
        it('accepts outbox events the other module has read', () => {
            const run = runRecord({
                outbox: [
                    outboxInOrders('from-orders', { orderStatus: 'DriverAssigned' }),
                    outboxInDeliveries('from-deliveries'),
                ],
                reads: [readBy('deliveries', 'from-orders'), readBy('orders', 'from-deliveries')],
                statuses: { A: { sequence: toLogSequence(9), status: 'DriverAssigned' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it.each([
            ['orders', outboxInOrders('unread', { sequence: toLogSequence(3) })],
            ['deliveries', outboxInDeliveries('unread', { sequence: toLogSequence(3) })],
        ])('reports an unread outbox event from %s, at that event', (_module, outbox) => {
            const run = runRecord({ outbox: [outbox] });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(3, 'Events are still flowing: unread has not been read.'),
            ]);
        });

        it('does not count a module reading its own outbox event', () => {
            const run = runRecord({
                outbox: [outboxInOrders('own', { sequence: toLogSequence(3) })],
                reads: [readBy('orders', 'own')],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(3, 'Events are still flowing: own has not been read.'),
            ]);
        });
    });

    describe("each order's kinds of event", () => {
        it('accepts both modules having the same kinds', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { kind: 'OrderDeliveryRequestAccepted' }),
                    eventInOrders('two', { kind: 'OrderDelivered' }),
                    eventInDeliveries('three', { kind: 'OrderDelivered' }),
                    eventInDeliveries('four', { kind: 'OrderDeliveryRequestAccepted' }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('reports each kind deliveries lacks, sorted, at the last orders event', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { kind: 'OrderPickedUp', sequence: toLogSequence(1) }),
                    eventInOrders('two', { kind: 'OrderReady', sequence: toLogSequence(2) }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(2, 'Order A: deliveries has no OrderPickedUp event.'),
                violation(2, 'Order A: deliveries has no OrderReady event.'),
            ]);
        });

        it('reports a kind orders lacks, at the last deliveries event, when orders has no events', () => {
            const run = runRecord({
                events: [
                    eventInDeliveries('one', {
                        kind: 'OrderDelivered',
                        sequence: toLogSequence(4),
                    }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(4, 'Order A: orders has no OrderDelivered event.'),
            ]);
        });

        it('reports what each module lacks, deliveries first', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { kind: 'OrderReady', sequence: toLogSequence(1) }),
                    eventInDeliveries('two', {
                        kind: 'OrderPickedUp',
                        sequence: toLogSequence(2),
                    }),
                ],
            });

            const secondModulesAgree = modulesAgree(run)
                .map((found) => found.message)
                .toArray();
            expect(secondModulesAgree).toEqual([
                'Order A: deliveries has no OrderReady event.',
                'Order A: orders has no OrderPickedUp event.',
            ]);
        });

        it('compares each order on its own, and reports orders sorted by ID', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', {
                        orderId: toOrderId('B'),
                        kind: 'OrderDelivered',
                        sequence: toLogSequence(1),
                    }),
                    eventInDeliveries('two', {
                        orderId: toOrderId('A'),
                        kind: 'OrderDelivered',
                        sequence: toLogSequence(2),
                    }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(2, 'Order A: orders has no OrderDelivered event.'),
                violation(1, 'Order B: deliveries has no OrderDelivered event.'),
            ]);
        });
    });

    describe("each order's driver", () => {
        it('accepts both modules naming the same driver', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { driverId: toDriverId('same') }),
                    eventInDeliveries('two', { driverId: toDriverId('same') }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('reports different drivers, at the last deliveries event', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', {
                        driverId: toDriverId('first'),
                        sequence: toLogSequence(1),
                    }),
                    eventInDeliveries('two', {
                        driverId: toDriverId('second'),
                        sequence: toLogSequence(2),
                    }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(2, 'Order A: orders has driver first, deliveries has second.'),
            ]);
        });

        it('goes by the latest driver each module names', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { driverId: toDriverId('old') }),
                    eventInOrders('two', { driverId: toDriverId('new') }),
                    eventInDeliveries('three', { driverId: toDriverId('new') }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('keeps a driver when a later event names none', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { driverId: toDriverId('same') }),
                    eventInOrders('two'),
                    eventInDeliveries('three', { driverId: toDriverId('same') }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('reports one module naming a driver and the other none', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', { sequence: toLogSequence(1) }),
                    eventInDeliveries('two', {
                        driverId: toDriverId('x'),
                        sequence: toLogSequence(2),
                    }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(2, 'Order A: orders has driver null, deliveries has x.'),
            ]);
        });

        it('links to the last orders event when deliveries has no events for the order', () => {
            const run = runRecord({
                events: [
                    eventInOrders('one', {
                        driverId: toDriverId('x'),
                        sequence: toLogSequence(1),
                    }),
                ],
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(1, 'Order A: deliveries has no OrderDelivered event.'),
                violation(1, 'Order A: orders has driver x, deliveries has null.'),
            ]);
        });
    });

    describe("deliveries' copy of an order", () => {
        it("accepts a copy that holds orders' status", () => {
            const run = runRecord({
                outbox: [fromOrders('last', 2, 'Delivered')],
                reads: [readBy('deliveries', 'last')],
                statuses: { A: { sequence: toLogSequence(9), status: 'Delivered' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it("reports a copy behind orders' status, at the outbox event it last read", () => {
            const run = runRecord({
                outbox: [fromOrders('last', 2, 'PickedUp', 5)],
                reads: [readBy('deliveries', 'last')],
                statuses: { A: { sequence: toLogSequence(9), status: 'Delivered' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(
                    5,
                    "Order A: orders has it as Delivered, and deliveries' copy as PickedUp.",
                ),
            ]);
        });

        it.each([
            ['first', [fromOrders('new', 2, 'Delivered'), fromOrders('old', 1, 'PickedUp')]],
            ['last', [fromOrders('old', 1, 'PickedUp'), fromOrders('new', 2, 'Delivered')]],
        ])('goes by the newest version it read, when that comes %s', (_place, outbox) => {
            const run = runRecord({
                outbox,
                reads: [readBy('deliveries', 'old'), readBy('deliveries', 'new')],
                statuses: { A: { sequence: toLogSequence(9), status: 'Delivered' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('keeps the first of two events of the same version', () => {
            const run = runRecord({
                outbox: [fromOrders('first', 1, 'Delivered'), fromOrders('second', 1, 'PickedUp')],
                reads: [readBy('deliveries', 'first'), readBy('deliveries', 'second')],
                statuses: { A: { sequence: toLogSequence(9), status: 'Delivered' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('takes any version over an event with none', () => {
            const run = runRecord({
                outbox: [
                    fromOrders('none', null, 'PickedUp'),
                    fromOrders('first', 1, 'Delivered'),
                ],
                reads: [readBy('deliveries', 'none'), readBy('deliveries', 'first')],
                statuses: { A: { sequence: toLogSequence(9), status: 'Delivered' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('has no copy to judge from outbox events orders did not write', () => {
            const run = runRecord({
                outbox: [
                    outboxInDeliveries('own', {
                        orderVersion: toVersionNumber(1),
                        orderStatus: 'PickedUp',
                    }),
                ],
                reads: [readBy('deliveries', 'own'), readBy('orders', 'own')],
                statuses: { A: { sequence: toLogSequence(9), status: 'Delivered' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('judges each order on its own copy', () => {
            const run = runRecord({
                outbox: [
                    outboxInOrders('for-a', {
                        orderId: toOrderId('A'),
                        orderVersion: toVersionNumber(5),
                        orderStatus: 'Delivered',
                    }),
                    outboxInOrders('for-b', {
                        orderId: toOrderId('B'),
                        orderVersion: toVersionNumber(1),
                        orderStatus: 'Cancelled' as OrderStatus,
                    }),
                ],
                reads: [readBy('deliveries', 'for-a'), readBy('deliveries', 'for-b')],
                statuses: {
                    A: { sequence: toLogSequence(8), status: 'Delivered' },
                    B: { sequence: toLogSequence(9), status: 'Cancelled' as OrderStatus },
                },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([]);
        });

        it('says unknown for a status one side does not state', () => {
            const run = runRecord({
                outbox: [
                    fromOrders('stated', 1, 'DriverAssigned', 5),
                    outboxInOrders('other', {
                        orderId: toOrderId('B'),
                        sequence: toLogSequence(6),
                    }),
                ],
                reads: [readBy('deliveries', 'stated'), readBy('deliveries', 'other')],
                statuses: { B: { sequence: toLogSequence(9), status: 'Delivered' } },
            });

            const violations = modulesAgree(run).toArray();
            expect(violations).toEqual([
                violation(
                    5,
                    "Order A: orders has it as unknown, and deliveries' copy as DriverAssigned.",
                ),
                violation(
                    6,
                    "Order B: orders has it as Delivered, and deliveries' copy as unknown.",
                ),
            ]);
        });
    });

    it('reports what is still flowing first, then each order, then the copies', () => {
        const run = runRecord({
            events: [eventInOrders('one', { kind: 'OrderReady', sequence: toLogSequence(1) })],
            outbox: [
                outboxInOrders('read', { orderStatus: 'PickedUp', sequence: toLogSequence(2) }),
                outboxInOrders('unread', { orderStatus: 'PickedUp', sequence: toLogSequence(3) }),
            ],
            reads: [readBy('deliveries', 'read')],
            statuses: { A: { sequence: toLogSequence(4), status: 'Delivered' } },
        });

        const violations = modulesAgree(run).toArray();
        expect(violations).toEqual([
            violation(3, 'Events are still flowing: unread has not been read.'),
            violation(1, 'Order A: deliveries has no OrderReady event.'),
            violation(2, "Order A: orders has it as Delivered, and deliveries' copy as PickedUp."),
        ]);
    });
});
