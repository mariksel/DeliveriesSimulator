import { beforeEach, describe, expect, it } from 'vitest';

import { V1_DELIVERIES_RULES } from './deliveries-rules';
import { V1_DRIVERS_RULES as VALUES } from '../drivers-rules';
import { toAreaId } from '../../map-and-routing/area-id';
import { toDeliveryEventId } from './delivery-event-id';
import { toDriverId } from '../driver';
import { toOrderEventId } from '../../orders/order-event-id';
import { toOrderId } from '../../orders/order';
import { toRestaurantId } from '../../restaurants/restaurant-place';
import { versionChain } from '../../system/records/version-chain';
import {
    DeliveriesHarness,
    FakeOrdersForDeliveries,
    RecordingDeliveriesReports,
} from './deliveries-harness.testing';
import { DeliveryHandoff } from './delivery-handoff';
import { DriverLocation, NewDriver } from '../driver';
import type { FieldsOf } from '../../system/classes/fields-of';
import type { OrderEventKind } from '../../orders/order-event-kind';
import type { OrderStatus } from '../../orders/order-status';
import { OrdersOutboxEvent } from '../../orders/orders-outbox-event';
import { Coordinates } from '../../map-and-routing/coordinates';
import { RestaurantPlace } from '../../restaurants/restaurant-place';
import { toDegrees } from '../../map-and-routing/numbers';
import { toVersionNumber } from '../../system/records/version-chain';
import { instantAt } from '../../system/time/instant.testing';
import { toOrdersOutboxEventId } from '../../orders/orders-outbox-event';

const RESTAURANT = Coordinates.create({ latitude: toDegrees(10.33), longitude: toDegrees(20.82) });
/** About 111 metres per 0.001 degrees of latitude. */
function north(thousandths: number): Coordinates {
    return Coordinates.create({
        latitude: toDegrees(RESTAURANT.latitude + thousandths / 1000),
        longitude: RESTAURANT.longitude,
    });
}

function handoff(orderId = toOrderId('order-1')): DeliveryHandoff {
    return DeliveryHandoff.create({
        orderId,
        restaurant: RestaurantPlace.create({
            id: toRestaurantId('restaurant-1'),
            areaId: toAreaId('area-1'),
            coordinates: RESTAURANT,
        }),
        requestEventId: toOrderEventId(`${orderId}:2`),
        orderVersion: toVersionNumber(2),
        orderStatus: 'Created',
    });
}

function fromOrders(
    id: string,
    kind: string,
    changes: Partial<FieldsOf<OrdersOutboxEvent>> = {},
): OrdersOutboxEvent {
    return OrdersOutboxEvent.create({
        id: toOrdersOutboxEventId(id),
        eventId: toOrderEventId(`orders-event-${id}`),
        orderId: toOrderId('order-1'),
        kind: kind as OrderEventKind,
        at: instantAt(0),
        driverId: null,
        orderVersion: toVersionNumber(4),
        orderStatus: 'DeliveryRequested',
        startedEventId: null,
        ...changes,
    });
}

function driver(
    id: string,
    thousandths: number,
    changes: Partial<FieldsOf<NewDriver>> = {},
): NewDriver {
    return NewDriver.create({
        id: toDriverId(id),
        areaId: toAreaId('area-1'),
        availability: 'Available',
        location: DriverLocation.create({
            coordinates: north(thousandths),
            deviceTime: instantAt(0),
        }),
        ...changes,
    });
}

function runDispatchPasses(deliveries: DeliveriesHarness, count: number): void {
    for (let pass = 0; pass < count; pass++) {
        deliveries.dispatchPass(pass * 30_000);
    }
}

function holdPickedUpOrders(deliveries: DeliveriesHarness, orderIds: readonly string[]): void {
    for (const order of orderIds) {
        const orderId = toOrderId(order);
        const deliveryHandoff = handoff(orderId);
        deliveries.receiveDeliveryRequest(0, deliveryHandoff);
        const id = toOrderId(order);
        const driverId = toDriverId('driver-1');
        deliveries.acceptRequest(0, id, driverId);
        const secondOrderId = toOrderId(order);
        const secondDriverId = toDriverId('driver-1');
        deliveries.pickUp(0, secondOrderId, secondDriverId);
    }
}

describe('DeliveriesModule', () => {
    let reporter: RecordingDeliveriesReports;
    let orders: FakeOrdersForDeliveries;
    let deliveries: DeliveriesHarness;

    beforeEach(() => {
        reporter = new RecordingDeliveriesReports();
        const eventId = toOrderEventId('order-1:6');
        orders = new FakeOrdersForDeliveries(eventId);
        deliveries = new DeliveriesHarness(reporter, orders, VALUES, V1_DELIVERIES_RULES);
    });

    const notified = (orderId = toOrderId('order-1')): string[] =>
        deliveries.notificationsOf(orderId).map((notification) => notification.driverId);

    /**
     * Takes one request from receipt to delivered, and says whether each driver command was
     * accepted.
     */
    function deliverOneOrder(): readonly boolean[] {
        const newDriver = driver('driver-1', 1);
        deliveries.addDriver(newDriver);
        const deliveryHandoff = handoff();
        deliveries.receiveDeliveryRequest(10, deliveryHandoff);
        deliveries.dispatchPass(30);
        const id = toOrderId('order-1');
        const driverId = toDriverId('driver-1');
        const orderId = toOrderId('order-1');
        const secondDriverId = toDriverId('driver-1');
        const secondOrderId = toOrderId('order-1');
        const thirdDriverId = toDriverId('driver-1');
        return [
            deliveries.acceptRequest(40, id, driverId).isOk,
            deliveries.pickUp(50, orderId, secondDriverId).isOk,
            deliveries.deliver(60, secondOrderId, thirdDriverId).isOk,
        ];
    }

    it('notifies a driver V1.0.0 makes eligible', () => {
        deliverOneOrder();

        const secondNotified = notified();
        expect(secondNotified).toEqual(['driver-1']);
    });

    it('accepts each command on the way to delivered', () => {
        const secondDeliverOneOrder = deliverOneOrder();
        expect(secondDeliverOneOrder).toEqual([true, true, true]);
    });

    it("keeps a delivery's earlier versions, reachable from its latest", () => {
        deliverOneOrder();

        const id = toOrderId('order-1');
        const secondVersionChain = versionChain(deliveries.delivery(id)!)
            .map((version) => [version.number, version.state])
            .toArray();
        expect(secondVersionChain).toEqual([
            [1, 'Requested'],
            [2, 'Assigned'],
            [3, 'PickedUp'],
            [4, 'Delivered'],
        ]);
    });

    it('keeps what never changes about a delivery apart from its versions', () => {
        deliverOneOrder();

        const id = toOrderId('order-1');
        const orderId = toOrderId('order-1');
        const deliveryPlace = deliveries.deliveryPlace(id);
        expect(deliveryPlace).toEqual({
            id: deliveries.delivery(orderId)?.orderDeliveryId,
            orderId: 'order-1',
            restaurant: handoff().restaurant,
        });
    });

    it('starts a driver at their first version', () => {
        const newDriver = driver('driver-1', 1);
        deliveries.addDriver(newDriver);

        const id = toDriverId('driver-1');
        const driverVersion = deliveries.driverVersion(id);
        expect(driverVersion).toMatchObject({
            number: 1,
            previous: null,
        });
    });

    it('moves a driver added again on to a new version, keeping the earlier one', () => {
        const newDriver = driver('driver-1', 1);
        deliveries.addDriver(newDriver);
        const id = toDriverId('driver-1');
        const driverVersion = deliveries.driverVersion(id);

        const secondNewDriver = driver('driver-1', 2);
        deliveries.addDriver(secondNewDriver);

        const driverId = toDriverId('driver-1');
        const second = deliveries.driverVersion(driverId);
        expect(second?.number).toBe(2);
        expect(second?.previous).toBe(driverVersion);
        expect(second?.location).toEqual(driver('driver-1', 2).location);
    });

    it('keeps each notification outstanding in its own version', () => {
        deliverOneOrder();
        const id = toOrderId('order-1');
        const notification = deliveries.notificationsOf(id)[0]!;

        const notificationVersion = deliveries.notificationVersion(notification.id);
        expect(notificationVersion).toEqual({
            notificationId: notification.id,
            isOutstanding: true,
            number: 1,
            previous: null,
        });
    });

    it('ends delivered, by the driver who accepted', () => {
        deliverOneOrder();

        const id = toOrderId('order-1');
        const delivery = deliveries.delivery(id);
        expect(delivery).toMatchObject({
            state: 'Delivered',
            driverId: 'driver-1',
        });
    });

    it('records each event, with its time and driver', () => {
        deliverOneOrder();

        const id = toOrderId('order-1');
        const events = deliveries
            .eventsOf(id)
            .map((event) => [event.kind, event.at, event.driverId]);
        expect(events).toEqual([
            ['OrderDeliveryRequest', 10, null],
            ['OrderDeliveryRequestAccepted', 40, 'driver-1'],
            ['OrderPickedUp', 50, 'driver-1'],
            ['OrderDelivered', 60, 'driver-1'],
        ]);
    });

    it('reports every event and notification it records', () => {
        deliverOneOrder();

        const id = toOrderId('order-1');
        const expected = deliveries.eventsOf(id);
        expect(reporter.events).toEqual(expected);
        const orderId = toOrderId('order-1');
        const notifications = deliveries.notificationsOf(orderId);
        expect(reporter.notifications).toEqual(notifications);
    });

    describe('receiving a request', () => {
        it('answers a repeat with the same ID, and adds nothing', () => {
            const deliveryHandoff = handoff();
            const secondReceiveDeliveryRequest = deliveries.receiveDeliveryRequest(
                1,
                deliveryHandoff,
            );

            const secondDeliveryHandoff = handoff();
            const receiveDeliveryRequest = deliveries.receiveDeliveryRequest(
                2,
                secondDeliveryHandoff,
            );
            expect(receiveDeliveryRequest).toBe(secondReceiveDeliveryRequest);
            const id = toOrderId('order-1');
            const events = deliveries.eventsOf(id);
            expect(events).toHaveLength(1);
        });

        it('gives each order its own delivery', () => {
            const orderId = toOrderId('a');
            const secondOrderId = toOrderId('b');
            const deliveryHandoff = handoff(orderId);
            const secondDeliveryHandoff = handoff(secondOrderId);
            const receiveDeliveryRequest = deliveries.receiveDeliveryRequest(1, deliveryHandoff);
            const expected = deliveries.receiveDeliveryRequest(1, secondDeliveryHandoff);
            expect(receiveDeliveryRequest).not.toBe(expected);
        });
    });

    describe('a dispatch pass', () => {
        it('notifies the best-ranked driver first', () => {
            const newDriver = driver('far', 5);
            deliveries.addDriver(newDriver);
            const secondNewDriver = driver('near', 1);
            deliveries.addDriver(secondNewDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            deliveries.dispatchPass(0);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['near']);
        });

        it('breaks a tie by driver ID, whichever was added first', () => {
            const newDriver = driver('driver-b', 1);
            deliveries.addDriver(newDriver);
            const secondNewDriver = driver('driver-a', 1);
            deliveries.addDriver(secondNewDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            deliveries.dispatchPass(0);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['driver-a']);
        });

        it('prefers a driver holding fewer orders', () => {
            const newDriver = driver('loaded', 1);
            deliveries.addDriver(newDriver);
            const secondNewDriver = driver('free', 1.5);
            deliveries.addDriver(secondNewDriver);
            const orderId = toOrderId('other');
            const deliveryHandoff = handoff(orderId);
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            const id = toOrderId('other');
            const driverId = toDriverId('loaded');
            deliveries.acceptRequest(0, id, driverId);
            const secondDeliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, secondDeliveryHandoff);

            deliveries.dispatchPass(0);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['free']);
        });

        it('notifies at most one driver per pass', () => {
            const newDriver = driver('near', 1);
            deliveries.addDriver(newDriver);
            const secondNewDriver = driver('next', 3);
            deliveries.addDriver(secondNewDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            deliveries.dispatchPass(0);
            deliveries.dispatchPass(0);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['near']);
        });

        it('notifies the next driver once its delay has passed', () => {
            const newDriver = driver('near', 1);
            deliveries.addDriver(newDriver);
            const secondNewDriver = driver('next', 3);
            deliveries.addDriver(secondNewDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            deliveries.dispatchPass(0);

            deliveries.dispatchPass(30_000);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['near', 'next']);
        });

        it('notifies nobody while no driver qualifies', () => {
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            deliveries.dispatchPass(0);

            const secondNotified = notified();
            expect(secondNotified).toEqual([]);
        });

        it('re-checks from current state, and so notifies a driver who qualifies later', () => {
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            deliveries.dispatchPass(0);
            const newDriver = driver('late', 1, {
                location: DriverLocation.create({
                    coordinates: north(1),
                    deviceTime: instantAt(30_000),
                }),
            });
            deliveries.addDriver(newDriver);

            deliveries.dispatchPass(30_000);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['late']);
        });

        it.each<[string, NewDriver]>([
            ['in another area', driver('c', 1, { areaId: toAreaId('area-2') })],
            ['offline', driver('c', 1, { availability: null })],
            ['with no location', driver('c', 1, { location: null })],
            ['too far', driver('c', 40)],
        ])('does not notify a driver %s', (_name, record) => {
            deliveries.addDriver(record);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            deliveries.dispatchPass(0);

            const secondNotified = notified();
            expect(secondNotified).toEqual([]);
        });

        it('does not notify a driver whose location has gone stale', () => {
            const newDriver = driver('c', 1);
            deliveries.addDriver(newDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            deliveries.dispatchPass(300_001);

            const secondNotified = notified();
            expect(secondNotified).toEqual([]);
        });

        it('leaves a closed request alone', () => {
            const newDriver = driver('a', 1);
            deliveries.addDriver(newDriver);
            const secondNewDriver = driver('b', 1);
            deliveries.addDriver(secondNewDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            const id = toOrderId('order-1');
            const driverId = toDriverId('a');
            deliveries.acceptRequest(0, id, driverId);

            deliveries.dispatchPass(0);

            const secondNotified = notified();
            expect(secondNotified).toEqual([]);
        });

        it('goes through open requests oldest first', () => {
            const newDriver = driver('c', 1);
            deliveries.addDriver(newDriver);
            const orderId = toOrderId('older');
            const deliveryHandoff = handoff(orderId);
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            const secondOrderId = toOrderId('newer');
            const secondDeliveryHandoff = handoff(secondOrderId);
            deliveries.receiveDeliveryRequest(1, secondDeliveryHandoff);

            deliveries.dispatchPass(1);

            const notifications = reporter.notifications.map(
                (notification) => notification.orderDeliveryId,
            );
            const id = toOrderId('older');
            const thirdOrderId = toOrderId('newer');
            expect(notifications).toEqual([
                deliveries.delivery(id)!.orderDeliveryId,
                deliveries.delivery(thirdOrderId)!.orderDeliveryId,
            ]);
        });

        it('stops at 5 unanswered notifications', () => {
            ['a', 'b', 'c', 'd', 'e', 'f'].forEach((id) => {
                const newDriver = driver(id, 1);
                deliveries.addDriver(newDriver);
            });
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            runDispatchPasses(deliveries, 10);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['a', 'b', 'c', 'd', 'e']);
        });
    });

    describe("each driver's counts, which dispatch reads instead of walking every delivery", () => {
        const order = toOrderId('order-1');
        const driverId = toDriverId('driver-1');

        beforeEach(() => {
            const newDriver = driver('driver-1', 1);
            deliveries.addDriver(newDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
        });

        it('are zero before the driver holds anything', () => {
            const driverCounts = deliveries.driverCounts(driverId);
            expect(driverCounts).toEqual({ held: [0, 0], pickedUp: [0, 0] });
        });

        it('count an accepted order as held', () => {
            deliveries.acceptRequest(1, order, driverId);

            const driverCounts = deliveries.driverCounts(driverId);
            expect(driverCounts).toEqual({ held: [1, 1], pickedUp: [0, 0] });
        });

        it('count a picked-up order as held and picked up', () => {
            deliveries.acceptRequest(1, order, driverId);

            deliveries.pickUp(2, order, driverId);

            const driverCounts = deliveries.driverCounts(driverId);
            expect(driverCounts).toEqual({ held: [1, 1], pickedUp: [1, 1] });
        });

        it('let go of a delivered order', () => {
            deliveries.acceptRequest(1, order, driverId);
            deliveries.pickUp(2, order, driverId);

            deliveries.deliver(3, order, driverId);

            const driverCounts = deliveries.driverCounts(driverId);
            expect(driverCounts).toEqual({ held: [0, 0], pickedUp: [0, 0] });
        });

        it('stay the same when a refused command changes nothing', () => {
            deliveries.acceptRequest(1, order, driverId);
            orders.answer = { isOk: false, refusal: 'NotReady' };

            deliveries.pickUp(2, order, driverId);

            const driverCounts = deliveries.driverCounts(driverId);
            expect(driverCounts).toEqual({ held: [1, 1], pickedUp: [0, 0] });
        });

        it('follow a change that arrives from the orders outbox', () => {
            deliveries.acceptRequest(1, order, driverId);
            orders.outbox = [fromOrders('a', 'OrderPickedUp', { driverId: driverId })];

            deliveries.readOrdersOutbox(5);

            const driverCounts = deliveries.driverCounts(driverId);
            expect(driverCounts).toEqual({ held: [1, 1], pickedUp: [1, 1] });
        });

        it('stay the same when an event only updates the copy of the order', () => {
            deliveries.acceptRequest(1, order, driverId);
            orders.outbox = [fromOrders('a', 'OrderReady')];

            deliveries.readOrdersOutbox(5);

            const driverCounts = deliveries.driverCounts(driverId);
            expect(driverCounts).toEqual({ held: [1, 1], pickedUp: [0, 0] });
        });
    });

    describe('accepting a request', () => {
        beforeEach(() => {
            const newDriver = driver('first', 1);
            deliveries.addDriver(newDriver);
            const secondNewDriver = driver('second', 2);
            deliveries.addDriver(secondNewDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
        });

        it('lets any eligible driver accept, notified or not', () => {
            const id = toOrderId('order-1');
            const driverId = toDriverId('second');
            expect(deliveries.acceptRequest(0, id, driverId).isOk).toBe(true);
            const secondNotified = notified();
            expect(secondNotified).toEqual([]);
        });

        it('lets the first valid acceptance win', () => {
            const id = toOrderId('order-1');
            const driverId = toDriverId('first');
            deliveries.acceptRequest(0, id, driverId);

            const orderId = toOrderId('order-1');
            const secondDriverId = toDriverId('second');
            const acceptRequest = deliveries.acceptRequest(0, orderId, secondDriverId);
            expect(acceptRequest).toEqual({
                isOk: false,
                refusal: 'NoOpenRequest',
            });
            const secondOrderId = toOrderId('order-1');
            expect(deliveries.delivery(secondOrderId)?.driverId).toBe('first');
            const thirdOrderId = toOrderId('order-1');
            const events = deliveries.eventsOf(thirdOrderId);
            expect(events).toHaveLength(2);
        });

        it('refuses an ineligible driver, giving the reason, and leaves the request open', () => {
            const newDriver = driver('offline', 1, { availability: null });
            deliveries.addDriver(newDriver);

            const id = toOrderId('order-1');
            const driverId = toDriverId('offline');
            const acceptRequest = deliveries.acceptRequest(0, id, driverId);
            expect(acceptRequest).toEqual({
                isOk: false,
                refusal: 'Offline',
            });
            const orderId = toOrderId('order-1');
            expect(deliveries.delivery(orderId)?.state).toBe('Requested');
        });

        it('refuses an unknown order or driver', () => {
            const id = toOrderId('nope');
            const driverId = toDriverId('first');
            const acceptRequest = deliveries.acceptRequest(0, id, driverId);
            expect(acceptRequest).toEqual({
                isOk: false,
                refusal: 'UnknownOrder',
            });
            const orderId = toOrderId('order-1');
            const secondDriverId = toDriverId('nope');
            const secondAcceptRequest = deliveries.acceptRequest(0, orderId, secondDriverId);
            expect(secondAcceptRequest).toEqual({
                isOk: false,
                refusal: 'UnknownDriver',
            });
        });
    });

    describe('its records', () => {
        it("keeps each order's events separate", () => {
            const orderId = toOrderId('a');
            const deliveryHandoff = handoff(orderId);
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            const secondOrderId = toOrderId('b');
            const secondDeliveryHandoff = handoff(secondOrderId);
            deliveries.receiveDeliveryRequest(0, secondDeliveryHandoff);

            const id = toOrderId('a');
            const events = deliveries.eventsOf(id).map((event) => event.orderId);
            expect(events).toEqual(['a']);
        });

        it('numbers each order delivery', () => {
            const orderId = toOrderId('a');
            const secondOrderId = toOrderId('b');
            const deliveryHandoff = handoff(orderId);
            const secondDeliveryHandoff = handoff(secondOrderId);
            expect([
                deliveries.receiveDeliveryRequest(0, deliveryHandoff),
                deliveries.receiveDeliveryRequest(0, secondDeliveryHandoff),
            ]).toEqual(['delivery-1', 'delivery-2']);
        });

        it('starts its copy of the order from the handoff', () => {
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            const id = toOrderId('order-1');
            const copy = deliveries.delivery(id)?.orderCopy;

            expect(copy).toMatchObject({ status: 'Created', version: 2 });
            const eventIds = copy?.eventIds.toArray();
            expect(eventIds).toEqual(['order-1:2']);
        });

        it("keeps its copy's status when an event has the same version", () => {
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            orders.outbox = [
                fromOrders('a', 'OrderReady', {
                    orderVersion: toVersionNumber(2),
                    orderStatus: 'Changed' as OrderStatus,
                }),
            ];

            deliveries.readOrdersOutbox(5);

            const id = toOrderId('order-1');
            expect(deliveries.delivery(id)?.orderCopy.status).toBe('Created');
        });

        it("measures a location's age back from now, by its device time", () => {
            const newDriver = driver('fresh', 1, {
                location: DriverLocation.create({
                    coordinates: north(1),
                    deviceTime: instantAt(300_000),
                }),
            });
            deliveries.addDriver(newDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            deliveries.dispatchPass(400_000);

            const secondNotified = notified();
            expect(secondNotified).toEqual(['fresh']);
        });
    });

    describe('the outbox', () => {
        it('writes one event for each event, and marks the ones deliveries started', () => {
            const newDriver = driver('driver-1', 1);
            deliveries.addDriver(newDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            const id = toOrderId('order-1');
            const driverId = toDriverId('driver-1');
            deliveries.acceptRequest(1, id, driverId);
            const orderId = toOrderId('order-1');
            const secondDriverId = toDriverId('driver-1');
            deliveries.pickUp(2, orderId, secondDriverId);

            const outboxEvents = deliveries
                .outboxEvents()
                .map((event) => [
                    event.kind,
                    event.eventId,
                    event.at,
                    event.wasStartedByDeliveries,
                ]);
            expect(outboxEvents).toEqual([
                ['OrderDeliveryRequest', 'delivery-1:1', 0, false],
                ['OrderDeliveryRequestAccepted', 'delivery-1:2', 1, true],
                ['OrderPickedUp', 'delivery-1:3', 2, false],
            ]);
            const expected = deliveries.outboxEvents();
            expect(reporter.written).toEqual(expected);
        });

        it('writes nothing for a refusal or a repeat', () => {
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            const secondDeliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, secondDeliveryHandoff);
            const id = toOrderId('order-1');
            const driverId = toDriverId('nobody');
            deliveries.acceptRequest(0, id, driverId);

            const outboxEvents = deliveries.outboxEvents();
            expect(outboxEvents).toHaveLength(1);
        });
    });

    describe('the inbox job', () => {
        beforeEach(() => {
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
        });

        it('updates its copy from an event with a newer version', () => {
            orders.outbox = [
                fromOrders('a', 'OrderReady', {
                    orderVersion: toVersionNumber(4),
                    orderStatus: 'DeliveryRequested',
                }),
            ];

            deliveries.readOrdersOutbox(5);

            const id = toOrderId('order-1');
            expect(deliveries.delivery(id)?.orderCopy).toMatchObject({
                status: 'DeliveryRequested',
                version: 4,
            });
        });

        it('keeps its copy when an event has an older version', () => {
            orders.outbox = [
                fromOrders('a', 'OrderReady', {
                    orderVersion: toVersionNumber(4),
                    orderStatus: 'DeliveryRequested',
                }),
            ];
            deliveries.readOrdersOutbox(5);
            const ordersEventForDeliveries = fromOrders('b', 'OrderReady', {
                orderVersion: toVersionNumber(3),
                orderStatus: 'Old' as OrderStatus,
                eventId: toOrderEventId('older'),
            });
            orders.outbox.push(ordersEventForDeliveries);

            deliveries.readOrdersOutbox(10);

            const id = toOrderId('order-1');
            expect(deliveries.delivery(id)?.orderCopy).toMatchObject({
                status: 'DeliveryRequested',
                version: 4,
            });
        });

        it('adds its own event for a ready order, linked to orders, with its own outbox event', () => {
            orders.outbox = [fromOrders('a', 'OrderReady')];

            deliveries.readOrdersOutbox(5);

            const id = toOrderId('order-1');
            const event = deliveries.eventsOf(id).at(-1);
            expect(event).toMatchObject({
                kind: 'OrderReady',
                at: 5,
                ordersEventId: 'orders-event-a',
            });
            const outboxEvent = deliveries.outboxEvents().at(-1);
            expect(outboxEvent).toMatchObject({
                kind: 'OrderReady',
                wasStartedByDeliveries: false,
            });
        });

        it('adds nothing for an event it already recorded', () => {
            orders.outbox = [
                fromOrders('a', 'OrderDeliveryRequest', { eventId: toOrderEventId('order-1:2') }),
            ];
            const id = toOrderId('order-1');
            const before = deliveries.eventsOf(id).length;

            deliveries.readOrdersOutbox(5);

            const orderId = toOrderId('order-1');
            const events = deliveries.eventsOf(orderId);
            expect(events).toHaveLength(before);
            const secondOrderId = toOrderId('order-1');
            expect(deliveries.delivery(secondOrderId)?.orderCopy.eventIds).toContain('order-1:2');
        });

        it('links the first event it recorded, too', () => {
            const id = toOrderId('order-1');
            const secondId = deliveries.eventsOf(id)[0]!.id;
            orders.outbox = [
                fromOrders('a', 'OrderDeliveryRequestAccepted', { startedEventId: secondId }),
            ];

            deliveries.readOrdersOutbox(5);

            const orderId = toOrderId('order-1');
            const ordersEvent = deliveries.ordersEventOf(orderId, 0);
            expect(ordersEvent).toBe('orders-event-a');
        });

        it('leaves the event itself as it was recorded when linking it', () => {
            const id = toOrderId('order-1');
            const recorded = deliveries.eventsOf(id)[0]!;
            orders.outbox = [
                fromOrders('a', 'OrderDeliveryRequestAccepted', { startedEventId: recorded.id }),
            ];

            deliveries.readOrdersOutbox(5);

            const orderId = toOrderId('order-1');
            expect(deliveries.eventsOf(orderId)[0]).toBe(recorded);
        });

        it('fails loudly on an event that says it started from one it never recorded', () => {
            const unknown = toDeliveryEventId('nope');
            orders.outbox = [
                fromOrders('a', 'OrderDeliveryRequestAccepted', { startedEventId: unknown }),
            ];

            expect(() => {
                deliveries.readOrdersOutbox(5);
            }).toThrow('Missing delivery event nope.');
        });

        it('links an event it started, without adding another', () => {
            const newDriver = driver('driver-1', 1);
            deliveries.addDriver(newDriver);
            const id = toOrderId('order-1');
            const driverId = toDriverId('driver-1');
            const acceptRequest = deliveries.acceptRequest(1, id, driverId);
            const started = acceptRequest.isOk ? acceptRequest.event!.id : toDeliveryEventId('');
            orders.outbox = [
                fromOrders('a', 'OrderDeliveryRequestAccepted', { startedEventId: started }),
            ];
            const orderId = toOrderId('order-1');
            const before = deliveries.eventsOf(orderId).length;

            deliveries.readOrdersOutbox(5);

            const secondOrderId = toOrderId('order-1');
            const events = deliveries.eventsOf(secondOrderId);
            expect(events).toHaveLength(before);
            const thirdOrderId = toOrderId('order-1');
            const ordersEvent = deliveries.ordersEventOf(thirdOrderId, before - 1);
            expect(ordersEvent).toBe('orders-event-a');
        });

        it('creates a missing own event for a driver command, and moves on', () => {
            const newDriver = driver('driver-1', 1);
            deliveries.addDriver(newDriver);
            const id = toOrderId('order-1');
            const driverId = toDriverId('driver-1');
            deliveries.acceptRequest(1, id, driverId);
            orders.outbox = [
                fromOrders('a', 'OrderPickedUp', { driverId: toDriverId('driver-1') }),
            ];

            deliveries.readOrdersOutbox(5);

            const orderId = toOrderId('order-1');
            expect(deliveries.delivery(orderId)?.state).toBe('PickedUp');
            const secondOrderId = toOrderId('order-1');
            const event = deliveries.eventsOf(secondOrderId).at(-1);
            expect(event).toMatchObject({
                kind: 'OrderPickedUp',
                driverId: 'driver-1',
            });
        });

        it('applies an event once, however often it runs', () => {
            orders.outbox = [fromOrders('a', 'OrderReady')];

            deliveries.readOrdersOutbox(5);
            deliveries.readOrdersOutbox(10);

            expect(reporter.read).toEqual(['a']);
        });

        it('never reads an event that fell behind its read lag', () => {
            orders.outbox = [fromOrders('new', 'OrderReady', { at: instantAt(100_000) })];
            deliveries.readOrdersOutbox(100_000);
            const ordersEventForDeliveries = fromOrders('old', 'OrderReady', { at: instantAt(0) });
            orders.outbox.push(ordersEventForDeliveries);

            deliveries.readOrdersOutbox(105_000);

            expect(reporter.read).toEqual(['new']);
        });

        it('stops looking at what it has read or let fall behind, at its next read', () => {
            orders.outbox = [fromOrders('new', 'OrderReady', { at: instantAt(100_000) })];
            deliveries.readOrdersOutbox(100_000);
            const ordersEventForDeliveries = fromOrders('old', 'OrderReady', { at: instantAt(0) });
            const secondOrdersEventForDeliveries = fromOrders('newer', 'OrderReady', {
                at: instantAt(105_000),
            });
            orders.outbox.push(ordersEventForDeliveries, secondOrdersEventForDeliveries);

            deliveries.readOrdersOutbox(105_000);

            expect(deliveries.inboxScanFrom).toBe(3);
        });

        it('keeps its place at an event that is still waiting for its order', () => {
            orders.outbox = [
                fromOrders('read', 'OrderReady'),
                fromOrders('waiting', 'OrderReady', { orderId: toOrderId('later') }),
            ];

            deliveries.readOrdersOutbox(5);

            expect(deliveries.inboxScanFrom).toBe(1);
        });

        it('reads events in the order the outbox holds them', () => {
            orders.outbox = [fromOrders('a', 'OrderReady'), fromOrders('b', 'OrderReady')];

            deliveries.readOrdersOutbox(5);

            expect(reporter.read).toEqual(['a', 'b']);
        });

        it('leaves an event unread until its order has a delivery', () => {
            orders.outbox = [fromOrders('a', 'OrderReady', { orderId: toOrderId('later') })];

            deliveries.readOrdersOutbox(5);

            expect(reporter.read).toEqual([]);
        });

        it('reads an event once its order has a delivery', () => {
            orders.outbox = [fromOrders('a', 'OrderReady', { orderId: toOrderId('later') })];
            deliveries.readOrdersOutbox(5);
            const orderId = toOrderId('later');
            const deliveryHandoff = handoff(orderId);
            deliveries.receiveDeliveryRequest(6, deliveryHandoff);

            deliveries.readOrdersOutbox(10);

            expect(reporter.read).toEqual(['a']);
        });

        it('reads from a minute before the latest event it has read, and no earlier', () => {
            const late = 120_000;
            orders.outbox = [fromOrders('new', 'OrderReady', { at: instantAt(late) })];
            deliveries.readOrdersOutbox(late);

            const ordersEventForDeliveries = fromOrders('tooOld', 'OrderReady', {
                at: instantAt(late - 60_001),
            });
            const secondOrdersEventForDeliveries = fromOrders('justInTime', 'OrderReady', {
                at: instantAt(late - 60_000),
            });
            orders.outbox.push(ordersEventForDeliveries, secondOrdersEventForDeliveries);
            deliveries.readOrdersOutbox(late + 5000);

            expect(reporter.read).toEqual(['new', 'justInTime']);
        });

        it('fails loudly on what the happy path cannot do yet', () => {
            orders.outbox = [fromOrders('a', 'OrderCancelled')];

            expect(() => {
                deliveries.readOrdersOutbox(5);
            }).toThrow('does not handle');
        });
    });

    describe('commands that orders decides', () => {
        beforeEach(() => {
            const newDriver = driver('driver-1', 1);
            deliveries.addDriver(newDriver);
            const deliveryHandoff = handoff();
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);
            const id = toOrderId('order-1');
            const driverId = toDriverId('driver-1');
            deliveries.acceptRequest(0, id, driverId);
        });

        it('calls orders, and keeps the link to its event', () => {
            const id = toOrderId('order-1');
            const driverId = toDriverId('driver-1');
            const pickUp = deliveries.pickUp(5, id, driverId);

            expect(orders.calls).toEqual(['pickUp 5 order-1 driver-1']);
            expect(pickUp).toMatchObject({
                isOk: true,
                event: { kind: 'OrderPickedUp', ordersEventId: 'order-1:6' },
            });
        });

        it('records nothing when orders refuses, and passes the refusal on', () => {
            orders.answer = { isOk: false, refusal: 'NotReady' };

            const id = toOrderId('order-1');
            const driverId = toDriverId('driver-1');
            const pickUp = deliveries.pickUp(5, id, driverId);
            expect(pickUp).toEqual({
                isOk: false,
                refusal: { orders: 'NotReady' },
            });
            const orderId = toOrderId('order-1');
            expect(deliveries.delivery(orderId)?.state).toBe('Assigned');
            const secondOrderId = toOrderId('order-1');
            const events = deliveries.eventsOf(secondOrderId);
            expect(events).toHaveLength(2);
        });

        it('refuses another driver without calling orders', () => {
            const id = toOrderId('order-1');
            const driverId = toDriverId('someone');
            const pickUp = deliveries.pickUp(5, id, driverId);
            expect(pickUp).toEqual({
                isOk: false,
                refusal: 'NotTheAssignedDriver',
            });
            const orderId = toOrderId('order-1');
            const secondDriverId = toDriverId('someone');
            const deliver = deliveries.deliver(5, orderId, secondDriverId);
            expect(deliver).toEqual({
                isOk: false,
                refusal: 'NotTheAssignedDriver',
            });
            expect(orders.calls).toEqual([]);
        });

        it('refuses an unknown order', () => {
            const id = toOrderId('nope');
            const driverId = toDriverId('driver-1');
            const pickUp = deliveries.pickUp(5, id, driverId);
            expect(pickUp).toEqual({
                isOk: false,
                refusal: 'UnknownOrder',
            });
        });

        it('does not check eligibility on an order the driver holds, so going offline never blocks it', () => {
            const newDriver = driver('driver-1', 1, { availability: null, location: null });
            deliveries.addDriver(newDriver);

            const id = toOrderId('order-1');
            const driverId = toDriverId('driver-1');
            expect(deliveries.pickUp(5, id, driverId).isOk).toBe(true);
            const orderId = toOrderId('order-1');
            const secondDriverId = toDriverId('driver-1');
            expect(deliveries.deliver(6, orderId, secondDriverId).isOk).toBe(true);
        });

        it('lets a driver holding 5 picked-up orders accept while close to the restaurant', () => {
            holdPickedUpOrders(deliveries, ['a', 'b', 'c', 'd', 'e']);
            const orderId = toOrderId('next');
            const deliveryHandoff = handoff(orderId);
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            const id = toOrderId('next');
            const driverId = toDriverId('driver-1');
            const acceptRequest = deliveries.acceptRequest(0, id, driverId);

            expect(acceptRequest.isOk).toBe(true);
        });

        it('counts picked-up orders towards being busy once the driver is farther away', () => {
            holdPickedUpOrders(deliveries, ['a', 'b', 'c', 'd', 'e']);
            const newDriver = driver('driver-1', 5);
            deliveries.addDriver(newDriver);
            const orderId = toOrderId('after');
            const deliveryHandoff = handoff(orderId);
            deliveries.receiveDeliveryRequest(0, deliveryHandoff);

            const id = toOrderId('after');
            const driverId = toDriverId('driver-1');
            const acceptRequest = deliveries.acceptRequest(0, id, driverId);

            expect(acceptRequest).toEqual({ isOk: false, refusal: 'Busy' });
        });
    });
});
