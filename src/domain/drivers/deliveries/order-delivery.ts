import type { FieldsOf } from '../../system/classes/fields-of';
import type { DriverId } from '../driver';
import type { OrderId } from '../../orders/order';
import type { IVersion } from '../../system/records/version-chain';
import type { Maker } from '../../system/records/maker';
import { assertVersionLink, FIRST_VERSION } from '../../system/records/version-chain';
import type { RestaurantPlace } from '../../restaurants/restaurant-place';
import type { Coordinates } from '../../map-and-routing/coordinates';
import type { VersionNumber } from '../../system/records/version-chain';
import { nextVersionNumber } from '../../system/records/version-chain';

/** An order's delivery in deliveries. */
export type OrderDeliveryId = string & { readonly brand: 'OrderDeliveryId' };
/** Marks text as an order delivery's ID. */
export const toOrderDeliveryId = (value: string): OrderDeliveryId => value as OrderDeliveryId;

/** Where an order delivery has got to. */
export const DeliveryState = {
    Requested: 'Requested',
    Assigned: 'Assigned',
    PickedUp: 'PickedUp',
    Delivered: 'Delivered',
} as const;

/** One of the values of {@link DeliveryState}. */
export type DeliveryState = (typeof DeliveryState)[keyof typeof DeliveryState];

/** The part of an order's delivery that never changes. */
export class OrderDelivery {
    /** An order's delivery, from the restaurant it is collected from to where it goes. */
    static create(fields: FieldsOf<OrderDelivery>): OrderDelivery {
        return new OrderDelivery(fields.id, fields.orderId, fields.restaurant, fields.destination);
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: OrderDeliveryId,
        readonly orderId: OrderId,
        readonly restaurant: RestaurantPlace,
        /** The point of the address the order goes to, as the request carried it (FND-90). */
        readonly destination: Coordinates,
    ) {
        Object.freeze(this);
    }
}

/** The fields a change to a delivery may set. */
type OrderDeliveryChanges = Partial<Pick<OrderDeliveryVersion, 'state' | 'driverId'>>;

/**
 * One state of an order's delivery in deliveries: its state and its driver. Its copy of the order
 * is a record of its own, as it changes when Orders' events arrive (FND-81).
 */
export class OrderDeliveryVersion implements IVersion<OrderDeliveryVersion> {
    /** A new delivery's first version, as requested. */
    static createNew(delivery: OrderDelivery, madeBy: Maker): OrderDeliveryVersion {
        return OrderDeliveryVersion.create({
            orderDeliveryId: delivery.id,
            orderId: delivery.orderId,
            state: DeliveryState.Requested,
            driverId: null,
            number: FIRST_VERSION,
            previous: null,
            madeBy,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<OrderDeliveryVersion>): OrderDeliveryVersion {
        assertVersionLink(`delivery ${fields.orderDeliveryId}`, fields.number, fields.previous);
        return new OrderDeliveryVersion(
            fields.orderDeliveryId,
            fields.orderId,
            fields.state,
            fields.driverId,
            fields.number,
            fields.previous,
            fields.madeBy,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderDeliveryId: OrderDeliveryId,
        readonly orderId: OrderId,
        readonly state: DeliveryState,
        readonly driverId: DriverId | null,
        readonly number: VersionNumber,
        readonly previous: OrderDeliveryVersion | null,
        /** The job run or API call that made this version, or the run's start (FND-81). */
        readonly madeBy: Maker,
    ) {
        Object.freeze(this);
    }

    /** The next version, with these changes, linked to this one. */
    next(changes: OrderDeliveryChanges, madeBy: Maker): OrderDeliveryVersion {
        return OrderDeliveryVersion.create({
            orderDeliveryId: this.orderDeliveryId,
            orderId: this.orderId,
            state: changes.state ?? this.state,
            driverId: changes.driverId === undefined ? this.driverId : changes.driverId,
            number: nextVersionNumber(this.number),
            previous: this,
            madeBy,
        });
    }
}
