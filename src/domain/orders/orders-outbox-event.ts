import { allTrue, recordPart } from '../system/digests/digest-parts';
import type { FieldsOf } from '../system/classes/fields-of';
import type { DeliveryEventId } from '../drivers/deliveries/delivery-event-id';
import type { DriverId } from '../drivers/driver';
import type { OrderEventId } from './order-event-id';
import type { OrderId } from './order';
import type { OrderEventKind } from './order-event-kind';
import type { OrderStatus } from './order-status';
import type { VersionNumber } from '../system/records/version-chain';
import type { IInstant } from '../system/time/instant';

/** One row of orders' outbox. */
export type OrdersOutboxEventId = string & { readonly brand: 'OrdersOutboxEventId' };
/** Marks text as the ID of a row in orders' outbox. */
export const toOrdersOutboxEventId = (value: string): OrdersOutboxEventId =>
    value as OrdersOutboxEventId;

/** One row of the orders outbox, which deliveries reads. It never changes. */
export class OrdersOutboxEvent {
    /** An outbox event, at a time from 0, carrying the order's version: a whole number from 1. */
    static create(fields: FieldsOf<OrdersOutboxEvent>): OrdersOutboxEvent {
        return new OrdersOutboxEvent(
            fields.id,
            fields.eventId,
            fields.orderId,
            fields.kind,
            fields.at,
            fields.driverId,
            fields.orderVersion,
            fields.orderStatus,
            fields.startedEventId,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: OrdersOutboxEventId,
        readonly eventId: OrderEventId,
        readonly orderId: OrderId,
        readonly kind: OrderEventKind,
        readonly at: IInstant,
        readonly driverId: DriverId | null,
        readonly orderVersion: VersionNumber,
        readonly orderStatus: OrderStatus,
        /** The event in deliveries that started this one, if any. */
        readonly startedEventId: DeliveryEventId | null,
    ) {
        Object.freeze(this);
    }

    /** The outbox event, written out field by field for a digest. */
    digestPart(): string {
        return recordPart([
            { text: this.id },
            { text: this.eventId },
            { text: this.orderId },
            { text: this.kind },
            { part: this.at.digestPart() },
            { textOrNull: this.driverId },
            { number: this.orderVersion },
            { text: this.orderStatus },
            { textOrNull: this.startedEventId },
        ]);
    }

    /** Whether another outbox event is the same, field by field. */
    equals(other: OrdersOutboxEvent): boolean {
        const isSameAt = this.at.equals(other.at);
        return allTrue(
            this.id === other.id,
            this.eventId === other.eventId,
            this.orderId === other.orderId,
            this.kind === other.kind,
            isSameAt,
            this.driverId === other.driverId,
            this.orderVersion === other.orderVersion,
            this.orderStatus === other.orderStatus,
            this.startedEventId === other.startedEventId,
        );
    }
}
