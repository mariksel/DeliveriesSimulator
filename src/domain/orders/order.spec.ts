import { describe, expect, it } from 'vitest';
import { toCustomerId } from '../restaurants/customers/customer';
import { toAddressId } from '../restaurants/customers/delivery-address';

import { Order, OrderVersion } from './order';
import { toOrderId } from './order';
import { toRestaurantId } from '../restaurants/restaurant-place';
import { versionChain } from '../system/records/version-chain';
import { TEST_MAKER } from '../system/records/maker.testing';

function created(): OrderVersion {
    const orderId = toOrderId('order-1');
    return OrderVersion.createNew(orderId, TEST_MAKER);
}

describe('an order in two parts', () => {
    it('keeps what never changes apart from its versions', () => {
        const id = toOrderId('order-1');
        const restaurantId = toRestaurantId('restaurant-1');
        const customerId = toCustomerId('customer-1');
        const addressId = toAddressId('address-1');
        const order = Order.create({ id, restaurantId, customerId, addressId });
        expect(order).toEqual({
            id: 'order-1',
            restaurantId: 'restaurant-1',
            customerId: 'customer-1',
            addressId: 'address-1',
        });
    });

    it('starts at version 1 with no request pending and no earlier version', () => {
        const first = created();

        expect(first).toMatchObject({
            number: 1,
            isDeliveryRequestPending: false,
            previous: null,
        });
    });

    it('links each version to the one before it', () => {
        const first = created();

        const next = first.next(true, TEST_MAKER);

        expect(next).toMatchObject({ number: 2, isDeliveryRequestPending: true, previous: first });
    });

    it('reads its whole history from its latest version', () => {
        const second = created().next(true, TEST_MAKER);
        const third = second.next(false, TEST_MAKER);

        const numbers = versionChain(third)
            .map((version) => version.number)
            .toArray();
        expect(numbers).toEqual([1, 2, 3]);
    });
});
