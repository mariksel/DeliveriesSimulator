import type { DeliveriesOutboxEvent } from '../drivers/deliveries/deliveries-outbox-event';
import type { DeliveryEventKind } from '../drivers/deliveries/delivery-event-kind';
import type { FieldsOf } from '../system/classes/fields-of';
import type { DeliveryEventId } from '../drivers/deliveries/delivery-event-id';
import type { DriverId } from '../drivers/driver';
import type { OrderId } from './order';
import type { IInstant } from '../system/time/instant';
import type { DeliveriesOutboxEventId } from '../drivers/deliveries/deliveries-outbox-event';

/** Orders' own copy of an event it read from the deliveries outbox: only what orders keeps. */
export class DeliveriesEventCopy {
    /** A copy of an event just read, keeping only what orders needs of it. */
    static createNew(event: DeliveriesOutboxEvent): DeliveriesEventCopy {
        return DeliveriesEventCopy.create({
            id: event.id,
            eventId: event.eventId,
            orderId: event.orderId,
            kind: event.kind,
            at: event.at,
            driverId: event.driverId,
            wasStartedByDeliveries: event.wasStartedByDeliveries,
        });
    }

    /** A copy from its values, at a time from 0. */
    static create(fields: FieldsOf<DeliveriesEventCopy>): DeliveriesEventCopy {
        return new DeliveriesEventCopy(
            fields.id,
            fields.eventId,
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
        readonly orderId: OrderId,
        readonly kind: DeliveryEventKind,
        readonly at: IInstant,
        readonly driverId: DriverId | null,
        /** Deliveries decided it alone, so orders has no event for it yet. */
        readonly wasStartedByDeliveries: boolean,
    ) {
        Object.freeze(this);
    }
}
