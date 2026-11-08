import type { List } from 'immutable';

import type { FieldsOf } from '../../system/classes/fields-of';
import type { OrderStatus } from '../../orders/order-status';
import type { DriverId } from '../driver';
import type { OrderEventId } from '../../orders/order-event-id';
import type { OrderId } from '../../orders/order';
import type { IVersion } from '../../system/records/version-chain';
import { assertVersionLink, FIRST_VERSION } from '../../system/records/version-chain';
import type { RestaurantPlace } from '../../restaurants/restaurant-place';
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

/** Deliveries' read-only copy of an order: only the orders outbox updates it after the handoff. */
export class OrderCopy {
    /** A copy of an order at a version. */
    static create(fields: FieldsOf<OrderCopy>): OrderCopy {
        return new OrderCopy(fields.status, fields.version, fields.eventIds);
    }

    declare private readonly brand: never;

    private constructor(
        readonly status: OrderStatus,
        readonly version: VersionNumber,
        readonly eventIds: List<OrderEventId>,
    ) {
        Object.freeze(this);
    }

    /**
     * The copy after one more event from the orders outbox. Only a newer version replaces the
     * stored status.
     */
    withEvent(
        eventId: OrderEventId,
        orderVersion: VersionNumber,
        orderStatus: OrderStatus,
    ): OrderCopy {
        const eventIds = this.eventIds.push(eventId);
        return OrderCopy.create({
            status: orderVersion > this.version ? orderStatus : this.status,
            version: orderVersion > this.version ? orderVersion : this.version,
            eventIds,
        });
    }
}

/** The part of an order's delivery that never changes. */
export class OrderDelivery {
    /** An order's delivery, from the restaurant it is collected from. */
    static create(fields: FieldsOf<OrderDelivery>): OrderDelivery {
        return new OrderDelivery(fields.id, fields.orderId, fields.restaurant);
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: OrderDeliveryId,
        readonly orderId: OrderId,
        readonly restaurant: RestaurantPlace,
    ) {
        Object.freeze(this);
    }
}

/** The fields a change to a delivery may set. */
type OrderDeliveryChanges = Partial<
    Pick<OrderDeliveryVersion, 'state' | 'driverId' | 'orderCopy'>
>;

/** One state of an order's delivery in deliveries, with its copy of the order. */
export class OrderDeliveryVersion implements IVersion<OrderDeliveryVersion> {
    /** A new delivery's first version, as requested, with its first copy of the order. */
    static createNew(delivery: OrderDelivery, orderCopy: OrderCopy): OrderDeliveryVersion {
        return OrderDeliveryVersion.create({
            orderDeliveryId: delivery.id,
            orderId: delivery.orderId,
            state: DeliveryState.Requested,
            driverId: null,
            orderCopy,
            number: FIRST_VERSION,
            previous: null,
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
            fields.orderCopy,
            fields.number,
            fields.previous,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderDeliveryId: OrderDeliveryId,
        readonly orderId: OrderId,
        readonly state: DeliveryState,
        readonly driverId: DriverId | null,
        readonly orderCopy: OrderCopy,
        readonly number: VersionNumber,
        readonly previous: OrderDeliveryVersion | null,
    ) {
        Object.freeze(this);
    }

    /** The next version, with these changes, linked to this one. */
    next(changes: OrderDeliveryChanges): OrderDeliveryVersion {
        const number = nextVersionNumber(this.number);
        return this.withFields(changes, number, this);
    }

    /**
     * This same version with its state replaced, keeping its number and link. Reading an orders
     * event that moves the delivery on does this to the version that read it.
     */
    inState(state: DeliveryState): OrderDeliveryVersion {
        return this.withFields({ state }, this.number, this.previous);
    }

    private withFields(
        changes: OrderDeliveryChanges,
        number: VersionNumber,
        previous: OrderDeliveryVersion | null,
    ): OrderDeliveryVersion {
        return OrderDeliveryVersion.create({
            orderDeliveryId: this.orderDeliveryId,
            orderId: this.orderId,
            state: changes.state ?? this.state,
            driverId: changes.driverId === undefined ? this.driverId : changes.driverId,
            orderCopy: changes.orderCopy ?? this.orderCopy,
            number,
            previous,
        });
    }
}
