import { DeliveryEventRecord } from '../../domain/drivers/deliveries/delivery-event-record';
import type { FieldsOf } from '../../domain/system/classes/fields-of';
import { OrdersOutboxEvent } from '../../domain/orders/orders-outbox-event';

const outboxFieldsOf = (event: OrdersOutboxEvent): FieldsOf<OrdersOutboxEvent> => ({
    id: event.id,
    eventId: event.eventId,
    orderId: event.orderId,
    kind: event.kind,
    at: event.at,
    driverId: event.driverId,
    orderVersion: event.orderVersion,
    orderStatus: event.orderStatus,
    startedEventId: event.startedEventId,
});

/**
 * An orders outbox event forged on purpose: this one, with some fields changed. The Simulator
 * self-tests break a known good log with it, to prove that each check can fail.
 */
export function forgedOrdersOutboxEvent(
    event: OrdersOutboxEvent,
    changes: Partial<FieldsOf<OrdersOutboxEvent>>,
): OrdersOutboxEvent {
    const fields = outboxFieldsOf(event);
    return OrdersOutboxEvent.create({ ...fields, ...changes });
}

const deliveriesEventFieldsOf = (event: DeliveryEventRecord): FieldsOf<DeliveryEventRecord> => ({
    id: event.id,
    orderDeliveryId: event.orderDeliveryId,
    orderId: event.orderId,
    kind: event.kind,
    at: event.at,
    driverId: event.driverId,
    ordersEventId: event.ordersEventId,
});

/**
 * A deliveries event forged on purpose: this one, with some fields changed. The Simulator
 * self-tests break a known good log with it, to prove that each check can fail.
 */
export function forgedDeliveriesEvent(
    event: DeliveryEventRecord,
    changes: Partial<FieldsOf<DeliveryEventRecord>>,
): DeliveryEventRecord {
    const fields = deliveriesEventFieldsOf(event);
    return DeliveryEventRecord.create({ ...fields, ...changes });
}
