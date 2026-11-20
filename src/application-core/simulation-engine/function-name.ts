import type { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import type { OrdersState } from '../../domain/orders/orders-state';

/**
 * The name of each state function a run calls, whatever its version (FND-81). A stored ID is a
 * name and a version, such as `orders.pick-up@1`; three functions that change no state, so no
 * commit holds them, have a name and versions but no stored ID.
 */
export const FunctionName = {
    OrdersCreateOrder: 'orders.create-order',
    OrdersRequestDelivery: 'orders.request-delivery',
    OrdersMarkReady: 'orders.mark-ready',
    OrdersPickUp: 'orders.pick-up',
    OrdersDeliver: 'orders.deliver',
    OrdersCompleteHandoff: 'orders.complete-handoff',
    OrdersReadDeliveriesEvent: 'orders.read-deliveries-event',
    OrdersRecordDeliveriesEventRead: 'orders.record-deliveries-event-read',
    OrdersRetryHandoffs: 'orders.retry-handoffs',
    DeliveriesReceiveDeliveryRequest: 'drivers.deliveries.receive-delivery-request',
    DeliveriesAnswerFromOrders: 'drivers.deliveries.answer-from-orders',
    DeliveriesAcceptRequest: 'drivers.deliveries.accept-request',
    DeliveriesNotifyNextDriver: 'drivers.deliveries.notify-next-driver',
    DeliveriesReadOrdersEvent: 'drivers.deliveries.read-orders-event',
    DeliveriesRecordOrdersEventRead: 'drivers.deliveries.record-orders-event-read',
    DeliveriesPickUp: 'drivers.deliveries.pick-up',
    DeliveriesDeliver: 'drivers.deliveries.deliver',
    DeliveriesReceiveLocation: 'drivers.deliveries.receive-location',
    DeliveriesReceiveLocations: 'drivers.deliveries.receive-locations',
} as const;

/** One of the values of {@link FunctionName}. */
export type FunctionName = (typeof FunctionName)[keyof typeof FunctionName];

/** Every function name, in the order above. */
export const FUNCTION_NAMES: readonly FunctionName[] = Object.values(FunctionName);

type Orders = typeof OrdersState;
type Deliveries = typeof DeliveriesState;

/**
 * Each state function's type, by its name: every version of a function takes the same arguments
 * and gives the same kind of result, so a run can switch between them.
 */
export interface IStateFunctions {
    readonly [FunctionName.OrdersCreateOrder]: Orders['createOrder'];
    readonly [FunctionName.OrdersRequestDelivery]: Orders['requestDelivery'];
    readonly [FunctionName.OrdersMarkReady]: Orders['markReady'];
    readonly [FunctionName.OrdersPickUp]: Orders['pickUp'];
    readonly [FunctionName.OrdersDeliver]: Orders['deliver'];
    readonly [FunctionName.OrdersCompleteHandoff]: Orders['completeHandoff'];
    readonly [FunctionName.OrdersReadDeliveriesEvent]: Orders['readDeliveriesEvent'];
    readonly [FunctionName.OrdersRecordDeliveriesEventRead]: Orders['recordDeliveriesEventRead'];
    readonly [FunctionName.OrdersRetryHandoffs]: Orders['retryHandoffs'];
    readonly [FunctionName.DeliveriesReceiveDeliveryRequest]: Deliveries['receiveDeliveryRequest'];
    readonly [FunctionName.DeliveriesAnswerFromOrders]: Deliveries['answerFromOrders'];
    readonly [FunctionName.DeliveriesAcceptRequest]: Deliveries['acceptRequest'];
    readonly [FunctionName.DeliveriesNotifyNextDriver]: Deliveries['notifyNextDriver'];
    readonly [FunctionName.DeliveriesReadOrdersEvent]: Deliveries['readOrdersEvent'];
    readonly [FunctionName.DeliveriesRecordOrdersEventRead]: Deliveries['recordOrdersEventRead'];
    readonly [FunctionName.DeliveriesPickUp]: Deliveries['pickUp'];
    readonly [FunctionName.DeliveriesDeliver]: Deliveries['deliver'];
    readonly [FunctionName.DeliveriesReceiveLocation]: Deliveries['receiveLocation'];
    readonly [FunctionName.DeliveriesReceiveLocations]: Deliveries['receiveLocations'];
}

/** Every version of every function, oldest first, by name: what a lookup is built from. */
export type FunctionVersionTable = {
    readonly [TName in FunctionName]: readonly IStateFunctions[TName][];
};

/** Whether a text is a function's name. */
export const isFunctionName = (text: string): text is FunctionName =>
    FUNCTION_NAMES.some((name) => name === text);
