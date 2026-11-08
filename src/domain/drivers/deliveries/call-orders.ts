import type { DriverId } from '../driver';
import type { OrderId } from '../../orders/order';
import type { DeliveryEventKind } from './delivery-event-kind';
import type { FollowUpKind } from './follow-up-kind';
import type { IInstant } from '../../system/time/instant';

/** The driver commands that orders decides. */
export type OrdersDecidedEvent =
    typeof DeliveryEventKind.OrderPickedUp | typeof DeliveryEventKind.OrderDelivered;

/** Asks the engine to put a driver's command to orders, and bring back its answer. */
export interface ICallOrders {
    readonly kind: typeof FollowUpKind.CallOrders;
    readonly at: IInstant;
    readonly orderId: OrderId;
    readonly driverId: DriverId;
    readonly eventKind: OrdersDecidedEvent;
}
