/** The event kinds on the path built so far. */
export const OrderEventKind = {
    OrderDeliveryRequest: 'OrderDeliveryRequest',
    OrderReady: 'OrderReady',
    OrderDeliveryRequestAccepted: 'OrderDeliveryRequestAccepted',
    OrderPickedUp: 'OrderPickedUp',
    OrderDelivered: 'OrderDelivered',
} as const;

/** One of the values of {@link OrderEventKind}. */
export type OrderEventKind = (typeof OrderEventKind)[keyof typeof OrderEventKind];
