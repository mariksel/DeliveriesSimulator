import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

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
import { DeliveryState, OrderCopy, OrderDelivery, OrderDeliveryVersion } from './order-delivery';
import { restaurantPlaceOf } from '../../restaurants/restaurant-place.testing';
import { toDegrees } from '../../map-and-routing/numbers';
import { toVersionNumber } from '../../system/records/version-chain';
import { instantAt } from '../../system/time/instant.testing';

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

const copyAt = (version: number): OrderCopy =>
    OrderCopy.create({
        status: 'Created',
        version: toVersionNumber(version),
        eventIds: List.of(REQUEST),
    });

function deliveryVersion(): OrderDeliveryVersion {
    const delivery = OrderDelivery.create({
        id: toOrderDeliveryId('delivery-1'),
        orderId: toOrderId('order-1'),
        restaurant: restaurantPlaceOf(),
    });
    const copy = copyAt(2);
    return OrderDeliveryVersion.createNew(delivery, copy);
}

describe("deliveries' records", () => {
    it('cannot change once made', () => {
        const records = [
            newDriver(0),
            copyAt(1),
            deliveryVersion(),
            NotificationVersion.createNew(NOTIFICATION),
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
        const first = DriverVersion.createNew(added);
        const again = newDriver(5);

        const next = first.readded(again);

        expect(first).toMatchObject({ number: 1, previous: null });
        expect(next).toMatchObject({ number: 2, previous: first });
        expect(next.location?.deviceTime.sinceStart.milliseconds).toBe(5);
    });
});

describe("an order delivery's versions", () => {
    it('keeps only a newer version of the order in its copy', () => {
        const copy = copyAt(3);

        const orderVersion = toVersionNumber(2);
        const older = copy.withEvent(OLDER, orderVersion, 'PickedUp');
        const secondOrderVersion = toVersionNumber(4);
        const newer = copy.withEvent(NEWER, secondOrderVersion, 'DriverAssigned');

        expect(older).toMatchObject({ status: 'Created', version: 3 });
        expect(newer).toMatchObject({ status: 'DriverAssigned', version: 4 });
        expect(newer.eventIds.size).toBe(2);
    });

    it('links each change to the version before it', () => {
        const first = deliveryVersion();

        const assigned = first.next({ state: DeliveryState.Assigned });

        expect(assigned).toMatchObject({ number: 2, previous: first, state: 'Assigned' });
    });

    it('can replace a version state in place, keeping its number and link', () => {
        const first = deliveryVersion();
        const updated = first.next({ state: DeliveryState.Assigned });

        const pickedUp = updated.inState(DeliveryState.PickedUp);

        expect(pickedUp).toMatchObject({ number: 2, previous: first, state: 'PickedUp' });
    });
});
