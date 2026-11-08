import { beforeEach, describe, expect, it } from 'vitest';

import { HANDOFF_RETRIES_PER_RUN, MAX_HANDOFF_RETRIES } from './orders-rule-definitions';
import { tunedOrdersRules } from './orders-rules.testing';
import { V1_ORDERS_RULES as VALUES } from './orders-rules';
import type { DriverId } from '../drivers/driver';
import type { OrderId } from './order';
import { toDeliveryEventId } from '../drivers/deliveries/delivery-event-id';
import { toDriverId } from '../drivers/driver';
import { toOrderDeliveryId } from '../drivers/deliveries/order-delivery';
import { toOrderId } from './order';
import { versionChain } from '../system/records/version-chain';
import { DeliveriesOutboxEvent } from '../drivers/deliveries/deliveries-outbox-event';
import type { DeliveryEventKind } from '../drivers/deliveries/delivery-event-kind';
import type { Order, OrderVersion } from './order';
import {
    FakeDeliveriesForOrders,
    OrdersHarness,
    RecordingOrdersReports,
} from './orders-harness.testing';
import type { OrderCommandResult } from './orders-state';
import { restaurantPlaceOf } from '../restaurants/restaurant-place.testing';
import { instantAt } from '../system/time/instant.testing';
import { toDeliveriesOutboxEventId } from '../drivers/deliveries/deliveries-outbox-event';

const RESTAURANT = restaurantPlaceOf();

function deliveriesEvent(
    id: string,
    orderId: OrderId,
    at: number,
    kind: DeliveryEventKind,
    driverId: DriverId | null = toDriverId('driver-1'),
    wasStartedByDeliveries = kind === 'OrderDeliveryRequestAccepted',
): DeliveriesOutboxEvent {
    return DeliveriesOutboxEvent.create({
        id: toDeliveriesOutboxEventId(id),
        eventId: toDeliveryEventId(`event-of-${id}`),
        orderDeliveryId: toOrderDeliveryId('delivery-1'),
        orderId,
        kind,
        at: instantAt(at),
        driverId,
        wasStartedByDeliveries,
    });
}

/** A driver accepting the request, which deliveries starts. */
const accepted = (
    id: string,
    orderId: OrderId,
    at = 0,
    driverId: DriverId | null = toDriverId('driver-1'),
): DeliveriesOutboxEvent =>
    deliveriesEvent(id, orderId, at, 'OrderDeliveryRequestAccepted', driverId);

/** An event deliveries did not start, which orders only keeps a copy of. */
const notStarted = (id: string, orderId: OrderId, at = 0): DeliveriesOutboxEvent =>
    deliveriesEvent(id, orderId, at, 'OrderReady');

function order(result: OrderCommandResult): OrderVersion {
    if (!result.isOk) {
        throw new Error(`Refused: ${result.refusal}`);
    }
    return result.version;
}

describe('OrdersModule', () => {
    let reporter: RecordingOrdersReports;
    let deliveries: FakeDeliveriesForOrders;
    let orders: OrdersHarness;

    beforeEach(() => {
        reporter = new RecordingOrdersReports();
        deliveries = new FakeDeliveriesForOrders();
        deliveries.answer = toOrderDeliveryId('delivery-1');
        orders = new OrdersHarness(reporter, deliveries, VALUES);
    });

    const requested = (): OrderId => {
        const id = orders.createOrder(0, RESTAURANT).id;
        orders.requestDelivery(0, id);
        return id;
    };

    it("takes one order from creation to delivered, with the lifecycle page's events and versions", () => {
        const id = orders.createOrder(0, RESTAURANT).id;

        const requestDelivery = orders.requestDelivery(10, id);
        const afterRequest = order(requestDelivery);
        const markReady = orders.markReady(20, id);
        const afterReady = order(markReady);
        deliveries.outbox = [accepted('a', id, 30)];
        orders.readDeliveriesOutbox(30);
        const afterAccepted = orders.order(id)!;
        const driverId = toDriverId('driver-1');
        const pickUp = orders.pickUp(40, id, driverId);
        const afterPickUp = order(pickUp);
        const secondDriverId = toDriverId('driver-1');
        const deliver = orders.deliver(50, id, secondDriverId);
        const afterDeliver = order(deliver);

        const map = [afterRequest, afterReady, afterAccepted, afterPickUp, afterDeliver].map(
            (step) => [step.status, step.number],
        );
        expect(map).toEqual([
            ['DeliveryRequested', 3],
            ['DeliveryRequested', 4],
            ['DriverAssigned', 5],
            ['PickedUp', 6],
            ['Delivered', 7],
        ]);
        const events = orders.eventsOf(id).map((event) => [event.kind, event.at, event.driverId]);
        expect(events).toEqual([
            ['OrderDeliveryRequest', 10, null],
            ['OrderReady', 20, null],
            ['OrderDeliveryRequestAccepted', 30, 'driver-1'],
            ['OrderPickedUp', 40, 'driver-1'],
            ['OrderDelivered', 50, 'driver-1'],
        ]);
    });

    it('gives each order its own number, in the order they are created', () => {
        expect([
            orders.createOrder(0, RESTAURANT).id,
            orders.createOrder(0, RESTAURANT).id,
        ]).toEqual(['order-1', 'order-2']);
    });

    it('gives each event an ID from its order and version', () => {
        const id = requested();

        expect(orders.eventsOf(id)[0]?.id).toBe('order-1:2');
    });

    it("keeps each order's events separate", () => {
        const first = orders.createOrder(0, RESTAURANT).id;
        const second = orders.createOrder(0, RESTAURANT).id;

        orders.markReady(1, first);

        const events = orders.eventsOf(first);
        expect(events).toHaveLength(1);
        const secondEvents = orders.eventsOf(second);
        expect(secondEvents).toHaveLength(0);
    });

    it("keeps an order's earlier versions, reachable from its latest", () => {
        const id = orders.createOrder(0, RESTAURANT).id;
        orders.markReady(10, id);

        const secondVersionChain = versionChain(orders.order(id)!)
            .map((version) => [version.number, version.isReady])
            .toArray();
        expect(secondVersionChain).toEqual([
            [1, false],
            [2, true],
        ]);
    });

    it('adds a new version of its copy of the delivery for each event read', () => {
        const id = requested();
        deliveries.outbox = [accepted('a', id, 30)];

        orders.readDeliveriesOutbox(30);

        const secondVersionChain = versionChain(orders.deliveryCopyVersion(id)!)
            .map((version) => version.events.size)
            .toArray();
        expect(secondVersionChain).toEqual([0, 1]);
    });

    it('reports creation and every event, with the order as it now stands', () => {
        const id = orders.createOrder(5, RESTAURANT).id;
        orders.markReady(6, id);

        expect(reporter.created).toEqual([
            {
                at: 5,
                order: expect.objectContaining({ id }) as Order,
                version: expect.objectContaining({ orderId: id, number: 1 }) as OrderVersion,
            },
        ]);
        const recorded = reporter.recorded.map((entry) => [
            entry.event.kind,
            entry.version.isReady,
            entry.version.number,
        ]);
        expect(recorded).toEqual([['OrderReady', true, 2]]);
    });

    it('refuses with a typed result, and changes and reports nothing', () => {
        const id = orders.createOrder(0, RESTAURANT).id;
        const before = orders.order(id);

        const driverId = toDriverId('driver-1');
        const pickUp = orders.pickUp(1, id, driverId);

        expect(pickUp).toEqual({ isOk: false, refusal: 'NotAllowedFromStatus' });
        const orderVersion = orders.order(id);
        expect(orderVersion).toBe(before);
        const events = orders.eventsOf(id);
        expect(events).toEqual([]);
        expect(reporter.recorded).toEqual([]);
        expect(reporter.written).toEqual([]);
        expect(reporter.created).toHaveLength(1);
    });

    it.each<[string, (module: OrdersHarness) => OrderCommandResult]>([
        [
            'requestDelivery',
            (module): OrderCommandResult => {
                const id = toOrderId('nope');
                return module.requestDelivery(0, id);
            },
        ],
        [
            'markReady',
            (module): OrderCommandResult => {
                const id = toOrderId('nope');
                return module.markReady(0, id);
            },
        ],
        [
            'pickUp',
            (module): OrderCommandResult => {
                const id = toOrderId('nope');
                const driverId = toDriverId('driver-1');
                return module.pickUp(0, id, driverId);
            },
        ],
        [
            'deliver',
            (module): OrderCommandResult => {
                const id = toOrderId('nope');
                const driverId = toDriverId('driver-1');
                return module.deliver(0, id, driverId);
            },
        ],
    ])('%s refuses an unknown order', (_name, command) => {
        const secondCommand = command(orders);
        expect(secondCommand).toEqual({ isOk: false, refusal: 'UnknownOrder' });
    });

    describe('the delivery request handoff', () => {
        it('hands over the request, and completes it on the acknowledgement', () => {
            const id = requested();

            expect(deliveries.handoffs).toEqual([
                {
                    orderId: id,
                    restaurant: RESTAURANT,
                    requestEventId: 'order-1:2',
                    orderVersion: 2,
                    orderStatus: 'Created',
                },
            ]);
            const orderVersion = orders.order(id);
            expect(orderVersion).toMatchObject({
                status: 'DeliveryRequested',
                number: 3,
                isDeliveryRequestPending: false,
            });
            expect(orders.deliveryCopy(id)?.orderDeliveryId).toBe('delivery-1');
        });

        it('adds one event for the two versions of a request', () => {
            const id = requested();

            const events = orders.eventsOf(id).map((event) => event.kind);
            expect(events).toEqual(['OrderDeliveryRequest']);
        });

        it('stays pending on a transient failure, with no outbox event and no copy', () => {
            deliveries.answer = null;

            const id = requested();

            const orderVersion = orders.order(id);
            expect(orderVersion).toMatchObject({
                status: 'Created',
                number: 2,
                isDeliveryRequestPending: true,
            });
            const outboxEvents = orders.outboxEvents();
            expect(outboxEvents).toEqual([]);
            const deliveryCopy = orders.deliveryCopy(id);
            expect(deliveryCopy).toBeUndefined();
        });

        it('retries pending requests, and leaves finished ones alone', () => {
            deliveries.answer = null;
            const id = requested();
            deliveries.answer = toOrderDeliveryId('delivery-1');
            const done = requested();
            const calls = deliveries.handoffs.length;

            orders.retryHandoffs(5);

            expect(deliveries.handoffs).toHaveLength(calls + 1);
            expect(deliveries.handoffs.at(-1)?.orderId).toBe(id);
            expect(orders.order(id)?.status).toBe('DeliveryRequested');
            expect(orders.order(done)?.number).toBe(3);
        });

        it('retries at most the limit in one run', () => {
            deliveries.answer = null;
            const values = tunedOrdersRules(
                VALUES,
                HANDOFF_RETRIES_PER_RUN,
                MAX_HANDOFF_RETRIES,
                2,
            );
            const limited = new OrdersHarness(reporter, deliveries, values);
            Array.from({ length: 5 }, () =>
                limited.requestDelivery(0, limited.createOrder(0, RESTAURANT).id),
            );
            const calls = deliveries.handoffs.length;

            limited.retryHandoffs(5);

            expect(deliveries.handoffs).toHaveLength(calls + 2);
        });
    });

    describe('the outbox', () => {
        it("writes one event for each event, with the order's version and status", () => {
            const id = requested();
            orders.markReady(1, id);

            const outboxEvents = orders
                .outboxEvents()
                .map((event) => [
                    event.kind,
                    event.eventId,
                    event.orderVersion,
                    event.orderStatus,
                ]);
            expect(outboxEvents).toEqual([
                ['OrderDeliveryRequest', 'order-1:2', 3, 'DeliveryRequested'],
                ['OrderReady', 'order-1:4', 4, 'DeliveryRequested'],
            ]);
            const expected = orders.outboxEvents();
            expect(reporter.written).toEqual(expected);
        });

        it('marks an event that deliveries started', () => {
            const id = requested();
            deliveries.outbox = [accepted('a', id)];

            orders.readDeliveriesOutbox(0);

            const outboxEvent = orders.outboxEvents().at(-1);
            expect(outboxEvent).toMatchObject({
                kind: 'OrderDeliveryRequestAccepted',
                startedEventId: 'event-of-a',
            });
        });
    });

    describe('the inbox job', () => {
        it('creates its own event for one that deliveries started, linked to it', () => {
            const id = requested();
            deliveries.outbox = [accepted('a', id)];

            orders.readDeliveriesOutbox(7);

            const orderVersion = orders.order(id);
            expect(orderVersion).toMatchObject({
                status: 'DriverAssigned',
                driverId: 'driver-1',
            });
            const event = orders.eventsOf(id).at(-1);
            expect(event).toMatchObject({
                kind: 'OrderDeliveryRequestAccepted',
                at: 7,
                deliveriesEventId: 'event-of-a',
            });
        });

        it('only stores a copy of one that deliveries did not start', () => {
            const id = requested();
            deliveries.outbox = [notStarted('a', id)];
            const before = orders.eventsOf(id).length;

            orders.readDeliveriesOutbox(7);

            const events = orders.eventsOf(id);
            expect(events).toHaveLength(before);
            const secondEvents = orders.deliveryCopy(id)?.events.map((event) => event.id);
            expect(secondEvents).toEqual(['a']);
        });

        it('reads events in the order the outbox holds them', () => {
            const id = requested();
            deliveries.outbox = [accepted('a', id), notStarted('b', id)];

            orders.readDeliveriesOutbox(7);

            expect(reporter.read).toEqual([
                { at: 7, id: 'a' },
                { at: 7, id: 'b' },
            ]);
        });

        it('applies an event once, however often it runs', () => {
            const id = requested();
            deliveries.outbox = [accepted('a', id)];

            orders.readDeliveriesOutbox(7);
            orders.readDeliveriesOutbox(12);

            expect(reporter.read).toEqual([{ at: 7, id: 'a' }]);
            const events = orders.eventsOf(id);
            expect(events).toHaveLength(2);
        });

        it('reads from a minute before the latest event it has read, and no earlier', () => {
            const id = requested();
            const other = requested();
            const late = 120_000;
            deliveries.outbox = [notStarted('new', id, late)];
            orders.readDeliveriesOutbox(late);

            deliveries.outbox = [
                ...deliveries.outbox,
                notStarted('tooOld', other, late - 60_001),
                notStarted('justInTime', other, late - 60_000),
            ];
            orders.readDeliveriesOutbox(late + 5000);

            const read = reporter.read.map((entry) => entry.id);
            expect(read).toEqual(['new', 'justInTime']);
        });

        it('never reads an event that fell behind its read lag', () => {
            const id = requested();
            deliveries.outbox = [accepted('new', id, 100_000)];
            orders.readDeliveriesOutbox(100_000);
            const deliveriesEventForOrders = accepted('old', id, 0);
            deliveries.outbox.push(deliveriesEventForOrders);

            orders.readDeliveriesOutbox(105_000);

            const read = reporter.read.map((entry) => entry.id);
            expect(read).toEqual(['new']);
        });

        it('stops looking at what it has read or let fall behind, at its next read', () => {
            const id = requested();
            deliveries.outbox = [accepted('new', id, 100_000)];
            orders.readDeliveriesOutbox(100_000);
            const deliveriesEventForOrders = accepted('old', id, 0);
            const driverId = toDriverId('driver-1');
            const newer = deliveriesEvent(
                'newer',
                id,
                105_000,
                'OrderDeliveryRequestAccepted',
                driverId,
                false,
            );
            deliveries.outbox.push(deliveriesEventForOrders, newer);

            orders.readDeliveriesOutbox(105_000);

            expect(orders.inboxScanFrom).toBe(3);
        });

        describe('fails loudly on what the happy path cannot do yet', () => {
            const reading = (): (() => void) => () => {
                orders.readDeliveriesOutbox(0);
            };

            it('an event kind it does not handle', () => {
                const orderId = requested();
                const driverId = toDriverId('driver-1');
                const pickedUp = deliveriesEvent('a', orderId, 0, 'OrderPickedUp', driverId, true);
                deliveries.outbox = [pickedUp];

                const secondReading = reading();
                expect(secondReading).toThrow('does not handle');
            });

            it('an acceptance with no driver', () => {
                const orderId = requested();
                deliveries.outbox = [accepted('b', orderId, 0, null)];

                const secondReading = reading();
                expect(secondReading).toThrow('does not handle');
            });

            it('an event for an order with no delivery copy', () => {
                deliveries.outbox = [accepted('c', orders.createOrder(0, RESTAURANT).id)];

                const secondReading = reading();
                expect(secondReading).toThrow('No delivery copy');
            });

            it('an event orders refuses', () => {
                const id = requested();
                deliveries.outbox = [accepted('d', id), accepted('e', id)];

                const secondReading = reading();
                expect(secondReading).toThrow('refused');
            });
        });
    });
});
