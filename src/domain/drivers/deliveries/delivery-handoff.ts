import type { FieldsOf } from '../../system/classes/fields-of';
import type { OrderStatus } from '../../orders/order-status';
import type { OrderEventId } from '../../orders/order-event-id';
import type { OrderId } from '../../orders/order';
import type { RestaurantPlace } from '../../restaurants/restaurant-place';
import type { VersionNumber } from '../../system/records/version-chain';

/** What orders hands over with a delivery request. */
export class DeliveryHandoff {
    /** A handoff, which carries the order's version. */
    static create(fields: FieldsOf<DeliveryHandoff>): DeliveryHandoff {
        return new DeliveryHandoff(
            fields.orderId,
            fields.restaurant,
            fields.requestEventId,
            fields.orderVersion,
            fields.orderStatus,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly orderId: OrderId,
        readonly restaurant: RestaurantPlace,
        readonly requestEventId: OrderEventId,
        readonly orderVersion: VersionNumber,
        readonly orderStatus: OrderStatus,
    ) {
        Object.freeze(this);
    }
}
