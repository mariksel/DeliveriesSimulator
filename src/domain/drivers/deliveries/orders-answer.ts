import type { OrderEventId } from '../../orders/order-event-id';
import type { OrderRefusal } from '../../orders/order-refusal';

/** How orders answered a call: the event it recorded, or its refusal. */
export type OrdersAnswer =
    | { readonly isOk: true; readonly eventId: OrderEventId }
    | { readonly isOk: false; readonly refusal: OrderRefusal };
