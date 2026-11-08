import { allTrue, recordPart } from '../../system/digests/digest-parts';
import type { FieldsOf } from '../../system/classes/fields-of';
import type { DriverId } from '../driver';
import type { OrderDeliveryId } from './order-delivery';
import type { OrderEventId } from '../../orders/order-event-id';
import type { OrderId } from '../../orders/order';
import type { DeliveryEventKind } from './delivery-event-kind';
import type { IInstant } from '../../system/time/instant';
import type { DeliveryEventId } from './delivery-event-id';

/** One row of the module's event table. It never changes. */
export class DeliveryEventRecord {
    /** An event, which happened at a time from 0. */
    static create(fields: FieldsOf<DeliveryEventRecord>): DeliveryEventRecord {
        return new DeliveryEventRecord(
            fields.id,
            fields.orderDeliveryId,
            fields.orderId,
            fields.kind,
            fields.at,
            fields.driverId,
            fields.ordersEventId,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: DeliveryEventId,
        readonly orderDeliveryId: OrderDeliveryId,
        readonly orderId: OrderId,
        readonly kind: DeliveryEventKind,
        readonly at: IInstant,
        readonly driverId: DriverId | null,
        /**
         * The matching event in orders, when known at the time. A match found later is linked in
         * the state.
         */
        readonly ordersEventId: OrderEventId | null,
    ) {
        Object.freeze(this);
    }

    /** The event, written out field by field for a digest. */
    digestPart(): string {
        return recordPart([
            { text: this.id },
            { text: this.orderDeliveryId },
            { text: this.orderId },
            { text: this.kind },
            { part: this.at.digestPart() },
            { textOrNull: this.driverId },
            { textOrNull: this.ordersEventId },
        ]);
    }

    /** Whether another event is the same, field by field. */
    equals(other: DeliveryEventRecord): boolean {
        const isSameAt = this.at.equals(other.at);
        return allTrue(
            this.id === other.id,
            this.orderDeliveryId === other.orderDeliveryId,
            this.orderId === other.orderId,
            this.kind === other.kind,
            isSameAt,
            this.driverId === other.driverId,
            this.ordersEventId === other.ordersEventId,
        );
    }
}
