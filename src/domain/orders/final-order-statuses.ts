/** The statuses an order can end in, from the V1.0.0 lifecycle. No event is allowed after them. */
export const FINAL_ORDER_STATUSES: readonly string[] = ['Delivered', 'OrderReturned', 'Cancelled'];
