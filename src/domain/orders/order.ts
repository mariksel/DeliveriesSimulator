import type { FieldsOf } from '../system/classes/fields-of';
import type { RestaurantId } from '../restaurants/restaurant-place';
import type { CustomerId } from '../restaurants/customers/customer';
import type { AddressId } from '../restaurants/customers/delivery-address';
import type { IVersion } from '../system/records/version-chain';
import type { Maker } from '../system/records/maker';
import { assertVersionLink, FIRST_VERSION } from '../system/records/version-chain';
import type { VersionNumber } from '../system/records/version-chain';
import { nextVersionNumber } from '../system/records/version-chain';

/** An order. */
export type OrderId = string & { readonly brand: 'OrderId' };
/** Marks text as an order's ID. */
export const toOrderId = (value: string): OrderId => value as OrderId;

/** The part of an order that never changes. */
export class Order {
    /** An order, from the restaurant that places it, for a customer at one of their addresses. */
    static create(fields: FieldsOf<Order>): Order {
        return new Order(fields.id, fields.restaurantId, fields.customerId, fields.addressId);
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: OrderId,
        readonly restaurantId: RestaurantId,
        /** The customer it is for, of its restaurant (FND-90). */
        readonly customerId: CustomerId,
        /** Which of the customer's stored addresses it goes to. */
        readonly addressId: AddressId,
    ) {
        Object.freeze(this);
    }
}

/**
 * One version of an order: whether a delivery request is pending, which no event records. Every
 * change to the order makes the next one, so its number is the order's version; the order's
 * status, driver, and whether it is ready are read from its events (FND-73, FND-81).
 */
export class OrderVersion implements IVersion<OrderVersion> {
    /** A new order's first version, with no request pending. */
    static createNew(orderId: OrderId, madeBy: Maker): OrderVersion {
        return OrderVersion.create({
            orderId,
            isDeliveryRequestPending: false,
            number: FIRST_VERSION,
            previous: null,
            madeBy,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<OrderVersion>): OrderVersion {
        assertVersionLink(`order ${fields.orderId}`, fields.number, fields.previous);
        return new OrderVersion(
            fields.orderId,
            fields.isDeliveryRequestPending,
            fields.number,
            fields.previous,
            fields.madeBy,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderId: OrderId,
        /** A delivery request is saved, and deliveries has not acknowledged it yet. */
        readonly isDeliveryRequestPending: boolean,
        readonly number: VersionNumber,
        readonly previous: OrderVersion | null,
        /** The job run or API call that made this version, or the run's start (FND-81). */
        readonly madeBy: Maker,
    ) {
        Object.freeze(this);
    }

    /** The next version, with whether a request is pending, linked to this one. */
    next(isDeliveryRequestPending: boolean, madeBy: Maker): OrderVersion {
        return OrderVersion.create({
            orderId: this.orderId,
            isDeliveryRequestPending,
            number: nextVersionNumber(this.number),
            previous: this,
            madeBy,
        });
    }
}
