import { allTrue, recordPart } from '../system/digests/digest-parts';
import type { FieldsOf } from '../system/classes/fields-of';
import type { DeliveryEventId } from '../drivers/deliveries/delivery-event-id';
import type { DriverId } from '../drivers/driver';
import type { OrderId } from './order';
import type { OrderEventKind } from './order-event-kind';
import type { IInstant } from '../system/time/instant';
import type { OrderEventId } from './order-event-id';

/** One row of the module's event table. It never changes. */
export class OrderEventRecord {
    /** An event, which happened at a time from 0. */
    static create(fields: FieldsOf<OrderEventRecord>): OrderEventRecord {
        return new OrderEventRecord(
            fields.id,
            fields.orderId,
            fields.kind,
            fields.at,
            fields.driverId,
            fields.deliveriesEventId,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: OrderEventId,
        readonly orderId: OrderId,
        readonly kind: OrderEventKind,
        readonly at: IInstant,
        readonly driverId: DriverId | null,
        /** The event in deliveries that this one was made from, when deliveries started it. */
        readonly deliveriesEventId: DeliveryEventId | null,
    ) {
        Object.freeze(this);
    }

    /** The event, written out field by field for a digest. */
    digestPart(): string {
        return recordPart([
            { text: this.id },
            { text: this.orderId },
            { text: this.kind },
            { part: this.at.digestPart() },
            { textOrNull: this.driverId },
            { textOrNull: this.deliveriesEventId },
        ]);
    }

    /** Whether another event is the same, field by field. */
    equals(other: OrderEventRecord): boolean {
        const isSameAt = this.at.equals(other.at);
        return allTrue(
            this.id === other.id,
            this.orderId === other.orderId,
            this.kind === other.kind,
            isSameAt,
            this.driverId === other.driverId,
            this.deliveriesEventId === other.deliveriesEventId,
        );
    }
}
