/** The statuses on the path built so far. The others come with the full V1.0.0 lifecycle. */
export const OrderStatus = {
    Created: 'Created',
    DeliveryRequested: 'DeliveryRequested',
    DriverAssigned: 'DriverAssigned',
    PickedUp: 'PickedUp',
    Delivered: 'Delivered',
} as const;

/** One of the values of {@link OrderStatus}. */
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
