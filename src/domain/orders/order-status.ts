/** The statuses on the path built so far. I03 adds the others in the V1.0.0 lifecycle. */
export const OrderStatus = {
    Created: 'Created',
    DeliveryRequested: 'DeliveryRequested',
    DriverAssigned: 'DriverAssigned',
    PickedUp: 'PickedUp',
    Delivered: 'Delivered',
} as const;

/** One of the values of {@link OrderStatus}. */
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
