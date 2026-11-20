import { List } from 'immutable';
import { describe, expect, it } from 'vitest';
import { deliveryAddressOf } from '../../restaurants/customers/delivery-address.testing';

import { toAreaId } from '../../map-and-routing/area-id';
import { toDeliveryEventId } from './delivery-event-id';
import { toDriverId } from '../driver';
import { toNotificationId } from './notification';
import { toOrderDeliveryId } from './order-delivery';
import { toOrderEventId } from '../../orders/order-event-id';
import { toOrderId } from '../../orders/order';
import { Coordinates } from '../../map-and-routing/coordinates';
import { DeliveriesState } from './deliveries-state';
import { DeliveryEventRecord } from './delivery-event-record';
import { DriverLocation, DriverVersion, NewDriver } from '../driver';
import { Notification, NotificationVersion } from './notification';
import { DeliveryState, OrderDelivery, OrderDeliveryVersion } from './order-delivery';
import { OrderCopyVersion } from './order-copy';
import { restaurantPlaceOf } from '../../restaurants/restaurant-place.testing';
import { toDegrees } from '../../map-and-routing/numbers';
import { toVersionNumber } from '../../system/records/version-chain';
import { instantAt } from '../../system/time/instant.testing';
import { TEST_MAKER } from '../../system/records/maker.testing';
import { Maker, toWorkId } from '../../system/records/maker';

const PLACE = Coordinates.create({ latitude: toDegrees(10.33), longitude: toDegrees(20.82) });
const REQUEST = toOrderEventId('order-1:2');
const NOTIFICATION = toNotificationId('n');
const OLDER = toOrderEventId('older');
const NEWER = toOrderEventId('newer');

const newDriver = (deviceTime: number): NewDriver =>
    NewDriver.create({
        id: toDriverId('driver-1'),
        areaId: toAreaId('area-1'),
        availability: 'Available',
        location: DriverLocation.create({ coordinates: PLACE, deviceTime: instantAt(deviceTime) }),
    });

function copyAt(version: number): OrderCopyVersion {
    const eventIds = List.of(REQUEST);
    return OrderCopyVersion.createNew(
        {
            orderId: toOrderId('order-1'),
            status: 'Created',
            version: toVersionNumber(version),
            eventIds,
        },
        TEST_MAKER,
    );
}

function deliveryVersion(): OrderDeliveryVersion {
    const delivery = OrderDelivery.create({
        id: toOrderDeliveryId('delivery-1'),
        orderId: toOrderId('order-1'),
        restaurant: restaurantPlaceOf(),
        destination: deliveryAddressOf().coordinates,
    });
    return OrderDeliveryVersion.createNew(delivery, TEST_MAKER);
}

describe("deliveries' records", () => {
    it('cannot change once made', () => {
        const records = [
            newDriver(0),
            copyAt(1),
            deliveryVersion(),
            NotificationVersion.createNew(NOTIFICATION, TEST_MAKER),
            DeliveriesState.createNew(),
        ];

        const frozen = records.map((record) => Object.isFrozen(record));
        expect(frozen).toEqual([true, true, true, true, true]);
    });

    it.each([-1, Number.NaN])('refuses a location said at device time %s', (deviceTime) => {
        expect(() => newDriver(deviceTime)).toThrow(RangeError);
    });

    it('refuses a copy of an order at version 0', () => {
        expect(() => copyAt(0)).toThrow(RangeError);
    });

    it('refuses an event or a notification before time 0', () => {
        const event = (): DeliveryEventRecord =>
            DeliveryEventRecord.create({
                id: toDeliveryEventId('delivery-1:1'),
                orderDeliveryId: toOrderDeliveryId('delivery-1'),
                orderId: toOrderId('order-1'),
                kind: 'OrderReady',
                at: instantAt(-1),
                driverId: null,
                ordersEventId: null,
            });
        const notification = (): Notification =>
            Notification.create({
                id: toNotificationId('n'),
                orderDeliveryId: toOrderDeliveryId('delivery-1'),
                requestEventId: toDeliveryEventId('delivery-1:1'),
                driverId: toDriverId('driver-1'),
                at: instantAt(-1),
            });

        expect(event).toThrow(RangeError);
        expect(notification).toThrow(RangeError);
    });
});

describe("a driver's versions", () => {
    it('starts as added, and moves on to a new version when added again', () => {
        const added = newDriver(0);
        const first = DriverVersion.createNew(added, TEST_MAKER);
        const again = newDriver(5);

        const next = first.readded(again, TEST_MAKER);

        expect(first).toMatchObject({ number: 1, previous: null });
        expect(next).toMatchObject({ number: 2, previous: first, areaId: again.areaId });
    });
});

describe("deliveries' copy of an order", () => {
    it('keeps only a newer version of the order', () => {
        const copy = copyAt(3);

        const orderVersion = toVersionNumber(2);
        const older = copy.withEvent(OLDER, orderVersion, 'PickedUp', TEST_MAKER);
        const secondOrderVersion = toVersionNumber(4);
        const newer = copy.withEvent(NEWER, secondOrderVersion, 'DriverAssigned', TEST_MAKER);

        expect(older).toMatchObject({ status: 'Created', version: 3 });
        expect(newer).toMatchObject({ status: 'DriverAssigned', version: 4 });
        expect(newer.eventIds.size).toBe(2);
    });

    it('moves on a version of its own with every event, linked to the one before', () => {
        const copy = copyAt(3);

        const orderVersion = toVersionNumber(4);
        const next = copy.withEvent(NEWER, orderVersion, 'DriverAssigned', TEST_MAKER);

        expect(next).toMatchObject({ number: 2, previous: copy });
    });
});

describe("an order delivery's versions", () => {
    it('links each change to the version before it', () => {
        const first = deliveryVersion();

        const assigned = first.next({ state: DeliveryState.Assigned }, TEST_MAKER);

        expect(assigned).toMatchObject({ number: 2, previous: first, state: 'Assigned' });
    });
});

describe("the makers of deliveries' versions", () => {
    const laterWork = toWorkId('session-9');
    const later = Maker.work(laterWork);

    it('keep the maker each first version was made with', () => {
        const driver = newDriver(0);
        const first = DriverVersion.createNew(driver, TEST_MAKER);
        const delivery = deliveryVersion();
        const notification = NotificationVersion.createNew(NOTIFICATION, TEST_MAKER);

        const makers = [first.madeBy, delivery.madeBy, notification.madeBy];

        expect(makers).toEqual([TEST_MAKER, TEST_MAKER, TEST_MAKER]);
    });

    it("give a driver's next version the maker of the change", () => {
        const driver = newDriver(0);
        const first = DriverVersion.createNew(driver, TEST_MAKER);

        const next = first.readded(driver, later);

        expect(next.madeBy).toBe(later);
    });

    it("give a delivery's next version the maker of the change", () => {
        const first = deliveryVersion();

        const next = first.next({ state: DeliveryState.Assigned }, later);

        expect(next.madeBy).toBe(later);
    });
});
