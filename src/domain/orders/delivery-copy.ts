import { List } from 'immutable';

import type { FieldsOf } from '../system/classes/fields-of';
import type { OrderDeliveryId } from '../drivers/deliveries/order-delivery';
import type { OrderId } from './order';
import type { IVersion } from '../system/records/version-chain';
import { assertVersionLink, FIRST_VERSION } from '../system/records/version-chain';
import type { DeliveriesEventCopy } from './deliveries-event-copy';
import type { VersionNumber } from '../system/records/version-chain';
import { nextVersionNumber } from '../system/records/version-chain';

/** The part of orders' copy of an order's delivery that never changes. */
export class DeliveryCopy {
    /** The copy of an order's delivery, under deliveries' ID for it. */
    static create(fields: FieldsOf<DeliveryCopy>): DeliveryCopy {
        return new DeliveryCopy(fields.orderId, fields.orderDeliveryId);
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderId: OrderId,
        readonly orderDeliveryId: OrderDeliveryId,
    ) {
        Object.freeze(this);
    }
}

/**
 * One state of orders' read-only copy of an order's delivery. Only the deliveries outbox adds to
 * it.
 */
export class DeliveryCopyVersion implements IVersion<DeliveryCopyVersion> {
    /** A new copy's first version, with no events yet. */
    static createNew(orderId: OrderId): DeliveryCopyVersion {
        const events = List<DeliveriesEventCopy>();
        return DeliveryCopyVersion.create({
            orderId,
            events,
            number: FIRST_VERSION,
            previous: null,
        });
    }

    /** A version from its values, whose number follows the version it links to. */
    static create(fields: FieldsOf<DeliveryCopyVersion>): DeliveryCopyVersion {
        assertVersionLink(
            `the delivery copy of ${fields.orderId}`,
            fields.number,
            fields.previous,
        );
        return new DeliveryCopyVersion(
            fields.orderId,
            fields.events,
            fields.number,
            fields.previous,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderId: OrderId,
        readonly events: List<DeliveriesEventCopy>,
        readonly number: VersionNumber,
        readonly previous: DeliveryCopyVersion | null,
    ) {
        Object.freeze(this);
    }

    /** The next version, with one more event read from deliveries. */
    withEvent(event: DeliveriesEventCopy): DeliveryCopyVersion {
        const events = this.events.push(event);
        return DeliveryCopyVersion.create({
            orderId: this.orderId,
            events,
            number: nextVersionNumber(this.number),
            previous: this,
        });
    }
}
