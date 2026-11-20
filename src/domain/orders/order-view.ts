import type { List } from 'immutable';

import { Check } from '../business-rules/check';
import type { FieldsOf } from '../system/classes/fields-of';
import type { Maker } from '../system/records/maker';
import type { DriverId } from '../drivers/driver';
import type { OrderVersion } from './order';
import type { OrderEventRecord } from './order-event-record';
import { OrderEventKind } from './order-event-kind';
import { OrderRefusal } from './order-refusal';
import { OrderStatus } from './order-status';
import {
    ACCEPT_DELIVERY_REQUEST,
    DELIVER,
    MARK_READY,
    PICK_UP,
    REQUEST_DELIVERY,
} from './orders-rule-definitions';

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

/** What a change to an order comes to: its new version, or a refusal. */
export type OrderChange =
    | { readonly isAllowed: true; readonly version: OrderVersion }
    | { readonly isAllowed: false; readonly refusal: OrderRefusal };

const refuse = (refusal: OrderRefusal): OrderChange => ({ isAllowed: false, refusal });

/** Whether an order has an event of a kind. */
const hasEvent = (events: List<OrderEventRecord>, kind: OrderEventKind): boolean =>
    events.some((event) => event.kind === kind);

/**
 * An order's status, from its events: its latest step on the path decides it, a delivery request
 * counting once deliveries has acknowledged it, and no event meaning Created (FND-73).
 */
function statusOf(events: List<OrderEventRecord>, isDeliveryRequestPending: boolean): OrderStatus {
    if (hasEvent(events, OrderEventKind.OrderDelivered)) {
        return OrderStatus.Delivered;
    }
    if (hasEvent(events, OrderEventKind.OrderPickedUp)) {
        return OrderStatus.PickedUp;
    }
    if (hasEvent(events, OrderEventKind.OrderDeliveryRequestAccepted)) {
        return OrderStatus.DriverAssigned;
    }
    const isRequested =
        hasEvent(events, OrderEventKind.OrderDeliveryRequest) && !isDeliveryRequestPending;
    return isRequested ? OrderStatus.DeliveryRequested : OrderStatus.Created;
}

/** The driver an order's acceptance named, or null before it is accepted. */
function driverOf(events: List<OrderEventRecord>): DriverId | null {
    const accepted = events.findLast(
        (event) => event.kind === OrderEventKind.OrderDeliveryRequestAccepted,
    );
    return accepted?.driverId ?? null;
}

/**
 * An order's full view: its version, and what its events record, its status, its driver, and
 * whether it is ready, read from them rather than stored again (FND-73, FND-81). Its methods are
 * the changes allowed, each giving the order's next version.
 */
export class OrderView {
    /** An order's view, from its latest version and the events recorded for it. */
    static of(version: OrderVersion, events: List<OrderEventRecord>): OrderView {
        return OrderView.create({
            version,
            status: statusOf(events, version.isDeliveryRequestPending),
            driverId: driverOf(events),
            isReady: hasEvent(events, OrderEventKind.OrderReady),
            isDeliveryRequestPending: version.isDeliveryRequestPending,
        });
    }

    /** A view from its values. */
    static create(fields: FieldsOf<OrderView>): OrderView {
        return new OrderView(
            fields.version,
            fields.status,
            fields.driverId,
            fields.isReady,
            fields.isDeliveryRequestPending,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly version: OrderVersion,
        readonly status: OrderStatus,
        readonly driverId: DriverId | null,
        readonly isReady: boolean,
        /** A delivery request is saved, and deliveries has not acknowledged it yet. */
        readonly isDeliveryRequestPending: boolean,
    ) {
        Object.freeze(this);
    }

    /** Saves the request as pending. The status changes when deliveries acknowledges it. */
    requestDelivery(madeBy: Maker): OrderChange {
        if (this.isDeliveryRequestPending) {
            return refuse(OrderRefusal.DeliveryRequestPending);
        }
        if (!REQUEST_DELIVERY_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        return this.changed(true, madeBy);
    }

    /** Records that deliveries acknowledged the request, which changes the status. */
    completeDeliveryRequest(madeBy: Maker): OrderChange {
        if (!this.isDeliveryRequestPending) {
            return refuse(OrderRefusal.NoPendingDeliveryRequest);
        }
        return this.changed(false, madeBy);
    }

    /**
     * Records that the order is ready. It can be recorded only once, and leaves the status
     * unchanged.
     */
    markReady(madeBy: Maker): OrderChange {
        if (this.isReady) {
            return refuse(OrderRefusal.AlreadyReady);
        }
        if (!MARK_READY_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        return this.changed(this.isDeliveryRequestPending, madeBy);
    }

    /** Assigns the order to the driver who accepted its open request, by the event recorded. */
    acceptDeliveryRequest(madeBy: Maker): OrderChange {
        if (!ACCEPT_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        return this.changed(this.isDeliveryRequestPending, madeBy);
    }

    /** Records that the assigned driver picked up the ready order. */
    pickUp(driverId: DriverId, madeBy: Maker): OrderChange {
        if (!PICK_UP_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        if (this.driverId !== driverId) {
            return refuse(OrderRefusal.NotTheAssignedDriver);
        }
        if (!this.isReady) {
            return refuse(OrderRefusal.NotReady);
        }
        return this.changed(this.isDeliveryRequestPending, madeBy);
    }

    /** Records that the assigned driver delivered the order, which is final. */
    deliver(driverId: DriverId, madeBy: Maker): OrderChange {
        if (!DELIVER_CHECK.isPassedBy(this.status, null)) {
            return refuse(OrderRefusal.NotAllowedFromStatus);
        }
        if (this.driverId !== driverId) {
            return refuse(OrderRefusal.NotTheAssignedDriver);
        }
        return this.changed(this.isDeliveryRequestPending, madeBy);
    }

    /** The order's next version, as a change allowed. */
    private changed(isDeliveryRequestPending: boolean, madeBy: Maker): OrderChange {
        const version = this.version.next(isDeliveryRequestPending, madeBy);
        return { isAllowed: true, version };
    }
}
