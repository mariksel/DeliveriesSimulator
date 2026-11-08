import { allTrue, recordPart } from '../../system/digests/digest-parts';
import type { FieldsOf } from '../../system/classes/fields-of';
import type { DeliveryEventId } from './delivery-event-id';
import type { DriverId } from '../driver';
import type { OrderDeliveryId } from './order-delivery';
import type { OrderId } from '../../orders/order';
import type { DeliveryEventKind } from './delivery-event-kind';
import type { IInstant } from '../../system/time/instant';

/** One row of deliveries' outbox. */
export type DeliveriesOutboxEventId = string & { readonly brand: 'DeliveriesOutboxEventId' };
/** Marks text as the ID of a row in deliveries' outbox. */
export const toDeliveriesOutboxEventId = (value: string): DeliveriesOutboxEventId =>
    value as DeliveriesOutboxEventId;

/** One row of the deliveries outbox, which orders reads. It never changes. */
export class DeliveriesOutboxEvent {
    /** An outbox event, at a time from 0. */
    static create(fields: FieldsOf<DeliveriesOutboxEvent>): DeliveriesOutboxEvent {
        return new DeliveriesOutboxEvent(
            fields.id,
            fields.eventId,
            fields.orderDeliveryId,
            fields.orderId,
            fields.kind,
            fields.at,
            fields.driverId,
            fields.wasStartedByDeliveries,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: DeliveriesOutboxEventId,
        readonly eventId: DeliveryEventId,
        readonly orderDeliveryId: OrderDeliveryId,
        readonly orderId: OrderId,
        readonly kind: DeliveryEventKind,
        readonly at: IInstant,
        readonly driverId: DriverId | null,
        /** Deliveries decided it alone, so orders has no event for it yet. */
        readonly wasStartedByDeliveries: boolean,
    ) {
        Object.freeze(this);
    }

    /** The outbox event, written out field by field for a digest. */
    digestPart(): string {
        return recordPart([
            { text: this.id },
            { text: this.eventId },
            { text: this.orderDeliveryId },
            { text: this.orderId },
            { text: this.kind },
            { part: this.at.digestPart() },
            { textOrNull: this.driverId },
            { isTrue: this.wasStartedByDeliveries },
        ]);
    }

    /** Whether another outbox event is the same, field by field. */
    equals(other: DeliveriesOutboxEvent): boolean {
        const isSameAt = this.at.equals(other.at);
        return allTrue(
            this.id === other.id,
            this.eventId === other.eventId,
            this.orderDeliveryId === other.orderDeliveryId,
            this.orderId === other.orderId,
            this.kind === other.kind,
            isSameAt,
            this.driverId === other.driverId,
            this.wasStartedByDeliveries === other.wasStartedByDeliveries,
        );
    }
}
