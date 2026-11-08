import type { FieldsOf } from '../system/classes/fields-of';
import type { DriverId } from '../drivers/driver';
import type { RestaurantId } from '../restaurants/restaurant-place';
import type { IVersion } from '../system/records/version-chain';
import { assertVersionLink, FIRST_VERSION } from '../system/records/version-chain';
import { Check } from '../business-rules/check';
import { OrderRefusal } from './order-refusal';
import { OrderStatus } from './order-status';
import {
    ACCEPT_DELIVERY_REQUEST,
    DELIVER,
    MARK_READY,
    PICK_UP,
    REQUEST_DELIVERY,
} from './orders-rule-definitions';
import type { VersionNumber } from '../system/records/version-chain';
import { nextVersionNumber } from '../system/records/version-chain';

/** An order. */
export type OrderId = string & { readonly brand: 'OrderId' };
/** Marks text as an order's ID. */
export const toOrderId = (value: string): OrderId => value as OrderId;

const READY_FROM: readonly OrderStatus[] = [
    OrderStatus.Created,
    OrderStatus.DeliveryRequested,
    OrderStatus.DriverAssigned,
];

/** A transition of the lifecycle: allowed from some statuses. It takes no values. */
type TransitionCheck = Check<OrderStatus, null>;

const REQUEST_DELIVERY_CHECK: TransitionCheck = Check.create({
    rule: REQUEST_DELIVERY,
    passes: (status: OrderStatus) => status === OrderStatus.Created,
});

const MARK_READY_CHECK: TransitionCheck = Check.create({
    rule: MARK_READY,
    passes: (status: OrderStatus) => READY_FROM.includes(status),
});

const ACCEPT_CHECK: TransitionCheck = Check.create({
    rule: ACCEPT_DELIVERY_REQUEST,
    passes: (status: OrderStatus) => status === OrderStatus.DeliveryRequested,
});

const PICK_UP_CHECK: TransitionCheck = Check.create({
    rule: PICK_UP,
    passes: (status: OrderStatus) => status === OrderStatus.DriverAssigned,
});

const DELIVER_CHECK: TransitionCheck = Check.create({
    rule: DELIVER,
    passes: (status: OrderStatus) => status === OrderStatus.PickedUp,
});

/** The part of an order that never changes. */
export class Order {
    /** An order, from the restaurant it is for. */
    static create(fields: FieldsOf<Order>): Order {
        return new Order(fields.id, fields.restaurantId);
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: OrderId,
        readonly restaurantId: RestaurantId,
    ) {
        Object.freeze(this);
    }
}

/** What a change to an order comes to: its new version, or a refusal. */
export type OrderChange =
    | { readonly isAllowed: true; readonly version: OrderVersion }
    | { readonly isAllowed: false; readonly refusal: OrderRefusal };

const refuse = (refusal: OrderRefusal): OrderChange => ({ isAllowed: false, refusal });

/** The fields a change to an order may set. */
type OrderVersionChanges = Partial<
    Pick<OrderVersion, 'status' | 'isDeliveryRequestPending' | 'isReady' | 'driverId'>
>;

/** One state of an order. A change adds a new one, and its number is the order's version. */
export class OrderVersion implements IVersion<OrderVersion> {
    /** A new order's first version, as Created. */
    static createNew(orderId: OrderId): OrderVersion {
        return OrderVersion.create({
            orderId,
            status: OrderStatus.Created,
            isDeliveryRequestPending: false,
            isReady: false,
            driverId: null,
            number: FIRST_VERSION,
            previous: null,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<OrderVersion>): OrderVersion {
        assertVersionLink(`order ${fields.orderId}`, fields.number, fields.previous);
        return new OrderVersion(
            fields.orderId,
            fields.status,
            fields.isDeliveryRequestPending,
            fields.isReady,
            fields.driverId,
            fields.number,
            fields.previous,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderId: OrderId,
        readonly status: OrderStatus,
        /** A delivery request is saved, and deliveries has not acknowledged it yet. */
        readonly isDeliveryRequestPending: boolean,
        readonly isReady: boolean,
        readonly driverId: DriverId | null,
        readonly number: VersionNumber,
        readonly previous: OrderVersion | null,
    ) {
        Object.freeze(this);
    }

    /** Saves the request as pending. The status changes when deliveries acknowledges it. */
    requestDelivery(): OrderChange {
        if (this.isDeliveryRequestPending) {
            return refuse(OrderRefusal.DeliveryRequestPending);
        }
        if (!REQUEST_DELIVERY_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        return this.changed({ isDeliveryRequestPending: true });
    }

    /** Records that deliveries acknowledged the request, which changes the status. */
    completeDeliveryRequest(): OrderChange {
        if (!this.isDeliveryRequestPending) {
            return refuse(OrderRefusal.NoPendingDeliveryRequest);
        }
        return this.changed({
            isDeliveryRequestPending: false,
            status: OrderStatus.DeliveryRequested,
        });
    }

    /**
     * Records that the order is ready. It can be recorded only once, and leaves the status
     * unchanged.
     */
    markReady(): OrderChange {
        if (this.isReady) {
            return refuse(OrderRefusal.AlreadyReady);
        }
        if (!MARK_READY_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        return this.changed({ isReady: true });
    }

    /** Assigns the order to the driver who accepted its open request. */
    acceptDeliveryRequest(driverId: DriverId): OrderChange {
        if (!ACCEPT_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        return this.changed({ status: OrderStatus.DriverAssigned, driverId });
    }

    /** Records that the assigned driver picked up the ready order. */
    pickUp(driverId: DriverId): OrderChange {
        if (!PICK_UP_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        if (this.driverId !== driverId) {
            return refuse(OrderRefusal.NotTheAssignedDriver);
        }
        if (!this.isReady) {
            return refuse(OrderRefusal.NotReady);
        }
        return this.changed({ status: OrderStatus.PickedUp });
    }

    /** Records that the assigned driver delivered the order, which is final. */
    deliver(driverId: DriverId): OrderChange {
        if (!DELIVER_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        if (this.driverId !== driverId) {
            return refuse(OrderRefusal.NotTheAssignedDriver);
        }
        return this.changed({ status: OrderStatus.Delivered });
    }

    /** The next version, with these changes, linked to this one. */
    private changed(changes: OrderVersionChanges): OrderChange {
        const version = OrderVersion.create({
            orderId: this.orderId,
            status: changes.status ?? this.status,
            isDeliveryRequestPending:
                changes.isDeliveryRequestPending ?? this.isDeliveryRequestPending,
            isReady: changes.isReady ?? this.isReady,
            driverId: changes.driverId === undefined ? this.driverId : changes.driverId,
            number: nextVersionNumber(this.number),
            previous: this,
        });
        return { isAllowed: true, version };
    }
}
