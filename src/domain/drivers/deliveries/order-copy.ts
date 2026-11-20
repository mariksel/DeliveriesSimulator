import type { List } from 'immutable';

import type { FieldsOf } from '../../system/classes/fields-of';
import type { Maker } from '../../system/records/maker';
import type { IVersion, VersionNumber } from '../../system/records/version-chain';
import {
    assertVersionLink,
    FIRST_VERSION,
    nextVersionNumber,
} from '../../system/records/version-chain';
import type { OrderEventId } from '../../orders/order-event-id';
import type { OrderId } from '../../orders/order';
import type { OrderStatus } from '../../orders/order-status';

/**
 * One version of Deliveries' read-only copy of an order: the order's status and version as Orders'
 * events last told it, and the events copied. Only Orders' outbox updates it after the handoff,
 * so it changes at its own rate and has versions of its own, apart from the delivery's (FND-81).
 */
export class OrderCopyVersion implements IVersion<OrderCopyVersion> {
    /** The first copy of an order, as its delivery request carried it. */
    static createNew(
        fields: Pick<OrderCopyVersion, 'orderId' | 'status' | 'version' | 'eventIds'>,
        madeBy: Maker,
    ): OrderCopyVersion {
        return OrderCopyVersion.create({
            ...fields,
            number: FIRST_VERSION,
            previous: null,
            madeBy,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<OrderCopyVersion>): OrderCopyVersion {
        assertVersionLink(`copy of order ${fields.orderId}`, fields.number, fields.previous);
        return new OrderCopyVersion(
            fields.orderId,
            fields.status,
            fields.version,
            fields.eventIds,
            fields.number,
            fields.previous,
            fields.madeBy,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderId: OrderId,
        readonly status: OrderStatus,
        /** The order's version this copy last took its status from. */
        readonly version: VersionNumber,
        readonly eventIds: List<OrderEventId>,
        readonly number: VersionNumber,
        readonly previous: OrderCopyVersion | null,
        /** The job run or API call that made this version, or the run's start (FND-81). */
        readonly madeBy: Maker,
    ) {
        Object.freeze(this);
    }

    /**
     * The copy's next version, after one more event from the orders outbox. Only a newer version
     * of the order replaces the stored status, so an older event arriving late changes nothing.
     */
    withEvent(
        eventId: OrderEventId,
        orderVersion: VersionNumber,
        orderStatus: OrderStatus,
        madeBy: Maker,
    ): OrderCopyVersion {
        const isNewer = orderVersion > this.version;
        const eventIds = this.eventIds.push(eventId);
        return OrderCopyVersion.create({
            orderId: this.orderId,
            status: isNewer ? orderStatus : this.status,
            version: isNewer ? orderVersion : this.version,
            eventIds,
            number: nextVersionNumber(this.number),
            previous: this,
            madeBy,
        });
    }
}
