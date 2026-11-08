/** Why orders refuses a change or a command. */
export const OrderRefusal = {
    NotAllowedFromStatus: 'NotAllowedFromStatus',
    DeliveryRequestPending: 'DeliveryRequestPending',
    NoPendingDeliveryRequest: 'NoPendingDeliveryRequest',
    AlreadyReady: 'AlreadyReady',
    NotReady: 'NotReady',
    NotTheAssignedDriver: 'NotTheAssignedDriver',
    UnknownOrder: 'UnknownOrder',
} as const;

/** One of the values of {@link OrderRefusal}. */
export type OrderRefusal = (typeof OrderRefusal)[keyof typeof OrderRefusal];
