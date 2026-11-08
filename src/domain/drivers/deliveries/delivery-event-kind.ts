/** The delivery event kinds on the path built so far. */
export const DeliveryEventKind = {
    OrderDeliveryRequest: 'OrderDeliveryRequest',
    OrderReady: 'OrderReady',
    OrderDeliveryRequestAccepted: 'OrderDeliveryRequestAccepted',
    OrderPickedUp: 'OrderPickedUp',
    OrderDelivered: 'OrderDelivered',
} as const;

/** One of the values of {@link DeliveryEventKind}. */
export type DeliveryEventKind = (typeof DeliveryEventKind)[keyof typeof DeliveryEventKind];
