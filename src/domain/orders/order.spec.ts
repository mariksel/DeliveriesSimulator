import { describe, expect, it } from 'vitest';

import type { OrderChange } from './order';
import { Order, OrderVersion } from './order';
import { toOrderId } from './order';
import { toRestaurantId } from '../restaurants/restaurant-place';
import { toDriverId } from '../drivers/driver';
import { versionChain } from '../system/records/version-chain';
import { toVersionNumber } from '../system/records/version-chain';

function allowed(result: OrderChange): OrderVersion {
    if (!result.isAllowed) {
        throw new Error(`Refused: ${result.refusal}`);
    }
    return result.version;
}

function created(): OrderVersion {
    const orderId = toOrderId('order-1');
    return OrderVersion.createNew(orderId);
}
function pending(): OrderVersion {
    const version = created();
    const secondRequestDelivery = version.requestDelivery();
    return allowed(secondRequestDelivery);
}
function requested(): OrderVersion {
    const version = pending();
    const secondCompleteDeliveryRequest = version.completeDeliveryRequest();
    return allowed(secondCompleteDeliveryRequest);
}
function assigned(): OrderVersion {
    const version = requested();
    const driverId = toDriverId('driver-1');
    const secondAcceptDeliveryRequest = version.acceptDeliveryRequest(driverId);
    return allowed(secondAcceptDeliveryRequest);
}
function assignedAndReady(): OrderVersion {
    const version = assigned();
    const secondMarkReady = version.markReady();
    return allowed(secondMarkReady);
}
function pickedUp(): OrderVersion {
    const version = assignedAndReady();
    const driverId = toDriverId('driver-1');
    const secondPickUp = version.pickUp(driverId);
    return allowed(secondPickUp);
}
function delivered(): OrderVersion {
    const version = pickedUp();
    const driverId = toDriverId('driver-1');
    const secondDeliver = version.deliver(driverId);
    return allowed(secondDeliver);
}

describe('an order in two parts', () => {
    it('keeps what never changes apart from its versions', () => {
        const id = toOrderId('order-1');
        const restaurantId = toRestaurantId('restaurant-1');
        const order = Order.create({ id, restaurantId });
        expect(order).toEqual({
            id: 'order-1',
            restaurantId: 'restaurant-1',
        });
    });

    it('starts with no earlier version', () => {
        expect(created().previous).toBeNull();
    });

    it('links each version to the one before it', () => {
        const first = created();

        const secondMarkReady = first.markReady();
        expect(allowed(secondMarkReady).previous).toBe(first);
    });

    it('reads its whole history from its latest version', () => {
        const latest = delivered();
        const secondVersionChain = versionChain(latest)
            .map((version) => version.number)
            .toArray();
        expect(secondVersionChain).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
});

describe('the order on the V1.0.0 happy path', () => {
    it('starts as Created, at version 1', () => {
        const orderVersion = created();
        expect(orderVersion).toMatchObject({
            status: 'Created',
            number: toVersionNumber(1),
            isReady: false,
            driverId: null,
        });
    });

    it('keeps its status while the delivery request is pending, and still changes version', () => {
        const orderVersion = pending();
        expect(orderVersion).toMatchObject({
            status: 'Created',
            number: toVersionNumber(2),
            isDeliveryRequestPending: true,
        });
    });

    it('moves to DeliveryRequested when deliveries acknowledges, changing version again', () => {
        const orderVersion = requested();
        expect(orderVersion).toMatchObject({
            status: 'DeliveryRequested',
            number: toVersionNumber(3),
            isDeliveryRequestPending: false,
        });
    });

    it.each<[string, () => OrderVersion, Partial<OrderVersion>]>([
        [
            'accepted',
            assigned,
            {
                status: 'DriverAssigned',
                number: toVersionNumber(4),
                driverId: toDriverId('driver-1'),
            },
        ],
        [
            'ready',
            assignedAndReady,
            { status: 'DriverAssigned', number: toVersionNumber(5), isReady: true },
        ],
        ['picked up', pickedUp, { status: 'PickedUp', number: toVersionNumber(6) }],
        ['delivered', delivered, { status: 'Delivered', number: toVersionNumber(7) }],
    ])('moves one version on when %s', (_name, order, expected) => {
        const secondOrder = order();
        expect(secondOrder).toMatchObject(expected);
    });

    it.each<[string, () => OrderVersion]>([
        ['Created', created],
        ['DeliveryRequested', requested],
        ['DriverAssigned', assigned],
    ])('can be marked ready from %s, leaving the status unchanged', (status, order) => {
        const version = order();
        const secondMarkReady = version.markReady();
        const orderVersion = allowed(secondMarkReady);
        expect(orderVersion).toMatchObject({ status, isReady: true });
    });
});

describe('what the order refuses', () => {
    const refusal = (result: OrderChange): string | undefined =>
        result.isAllowed ? undefined : result.refusal;

    it('a second delivery request while one is pending', () => {
        const version = pending();
        const secondRequestDelivery = version.requestDelivery();
        const secondRefusal = refusal(secondRequestDelivery);
        expect(secondRefusal).toBe('DeliveryRequestPending');
    });

    it('a delivery request once one is open', () => {
        const version = requested();
        const secondRequestDelivery = version.requestDelivery();
        const secondRefusal = refusal(secondRequestDelivery);
        expect(secondRefusal).toBe('NotAllowedFromStatus');
    });

    it('completing a request that is not pending', () => {
        const version = created();
        const secondCompleteDeliveryRequest = version.completeDeliveryRequest();
        const secondRefusal = refusal(secondCompleteDeliveryRequest);
        expect(secondRefusal).toBe('NoPendingDeliveryRequest');
    });

    it('being marked ready twice', () => {
        const version = assignedAndReady();
        const secondMarkReady = version.markReady();
        const secondRefusal = refusal(secondMarkReady);
        expect(secondRefusal).toBe('AlreadyReady');
    });

    it('being marked ready after pickup', () => {
        const picked = pickedUp();
        // Pickup needs a ready order, so this one is forged.
        const notReady = OrderVersion.create({
            orderId: picked.orderId,
            status: picked.status,
            isDeliveryRequestPending: picked.isDeliveryRequestPending,
            isReady: false,
            driverId: picked.driverId,
            number: picked.number,
            previous: picked.previous,
        });

        const secondMarkReady = notReady.markReady();
        const secondRefusal = refusal(secondMarkReady);
        expect(secondRefusal).toBe('NotAllowedFromStatus');
    });

    it('acceptance unless a request is open, including while it is pending', () => {
        const version = created();
        const driverId = toDriverId('driver-1');
        const secondAcceptDeliveryRequest = version.acceptDeliveryRequest(driverId);
        const secondRefusal = refusal(secondAcceptDeliveryRequest);
        expect(secondRefusal).toBe('NotAllowedFromStatus');
        const orderVersion = pending();
        const secondDriverId = toDriverId('driver-1');
        const thirdAcceptDeliveryRequest = orderVersion.acceptDeliveryRequest(secondDriverId);
        const thirdRefusal = refusal(thirdAcceptDeliveryRequest);
        expect(thirdRefusal).toBe('NotAllowedFromStatus');
        const secondOrderVersion = assigned();
        const thirdDriverId = toDriverId('driver-2');
        const fourthAcceptDeliveryRequest =
            secondOrderVersion.acceptDeliveryRequest(thirdDriverId);
        const fourthRefusal = refusal(fourthAcceptDeliveryRequest);
        expect(fourthRefusal).toBe('NotAllowedFromStatus');
    });

    it('pickup before the order is ready', () => {
        const version = assigned();
        const driverId = toDriverId('driver-1');
        const secondPickUp = version.pickUp(driverId);
        const secondRefusal = refusal(secondPickUp);
        expect(secondRefusal).toBe('NotReady');
    });

    it('pickup or delivery by another driver', () => {
        const version = assignedAndReady();
        const driverId = toDriverId('driver-2');
        const secondPickUp = version.pickUp(driverId);
        const secondRefusal = refusal(secondPickUp);
        expect(secondRefusal).toBe('NotTheAssignedDriver');
        const orderVersion = pickedUp();
        const secondDriverId = toDriverId('driver-2');
        const secondDeliver = orderVersion.deliver(secondDriverId);
        const thirdRefusal = refusal(secondDeliver);
        expect(thirdRefusal).toBe('NotTheAssignedDriver');
    });

    it('pickup or delivery out of order', () => {
        const version = requested();
        const driverId = toDriverId('driver-1');
        const secondPickUp = version.pickUp(driverId);
        const secondRefusal = refusal(secondPickUp);
        expect(secondRefusal).toBe('NotAllowedFromStatus');
        const orderVersion = assignedAndReady();
        const secondDriverId = toDriverId('driver-1');
        const secondDeliver = orderVersion.deliver(secondDriverId);
        const thirdRefusal = refusal(secondDeliver);
        expect(thirdRefusal).toBe('NotAllowedFromStatus');
    });

    it.each<[string, (done: OrderVersion) => OrderChange]>([
        ['a delivery request', (done): OrderChange => done.requestDelivery()],
        [
            'being marked ready',
            (done): OrderChange => {
                const notReady = OrderVersion.create({
                    orderId: done.orderId,
                    status: done.status,
                    isDeliveryRequestPending: done.isDeliveryRequestPending,
                    isReady: false,
                    driverId: done.driverId,
                    number: done.number,
                    previous: done.previous,
                });
                return notReady.markReady();
            },
        ],
        [
            'acceptance',
            (done): OrderChange => {
                const driverId = toDriverId('driver-1');
                return done.acceptDeliveryRequest(driverId);
            },
        ],
        [
            'pickup',
            (done): OrderChange => {
                const driverId = toDriverId('driver-1');
                return done.pickUp(driverId);
            },
        ],
        [
            'delivery',
            (done): OrderChange => {
                const driverId = toDriverId('driver-1');
                return done.deliver(driverId);
            },
        ],
    ])('%s after delivery, which is final', (_name, attempt) => {
        const done = delivered();
        expect(attempt(done).isAllowed).toBe(false);
    });

    it('never changes the order it refuses', () => {
        const order = pending();
        const before = Object.entries(order);

        order.requestDelivery();

        const isFrozen = Object.isFrozen(order);
        expect(isFrozen).toBe(true);
        const after = Object.entries(order);
        expect(after).toEqual(before);
    });
});
