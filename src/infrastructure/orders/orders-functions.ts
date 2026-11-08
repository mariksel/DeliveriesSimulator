import { List } from 'immutable';

import { OrdersState } from '../../domain/orders/orders-state';
import type { IRegisteredFunction } from '../system/functions/registered-function';
import { ArgumentKind, StateModule } from '../system/functions/registered-function';

const { Value, Instant, RestaurantPlace, DeliveriesOutbox, DeliveriesOutboxEvent, OrdersRules } =
    ArgumentKind;
const ORDERS = StateModule.Orders;

/**
 * The orders functions a state commit can hold, with their stored IDs. `retryHandoffs` is not
 * here: it changes no state, as its follow-ups make the commits.
 */
export const ORDERS_FUNCTIONS = List<IRegisteredFunction>([
    {
        id: 'orders.create-order@1',
        fn: OrdersState.createOrder,
        module: ORDERS,
        args: [Instant, RestaurantPlace],
    },
    {
        id: 'orders.request-delivery@1',
        fn: OrdersState.requestDelivery,
        module: ORDERS,
        args: [Instant, Value],
    },
    {
        id: 'orders.mark-ready@1',
        fn: OrdersState.markReady,
        module: ORDERS,
        args: [Instant, Value],
    },
    {
        id: 'orders.pick-up@1',
        fn: OrdersState.pickUp,
        module: ORDERS,
        args: [Instant, Value, Value],
    },
    {
        id: 'orders.deliver@1',
        fn: OrdersState.deliver,
        module: ORDERS,
        args: [Instant, Value, Value],
    },
    {
        id: 'orders.complete-handoff@1',
        fn: OrdersState.completeHandoff,
        module: ORDERS,
        args: [Instant, Value, Value],
    },
    {
        id: 'orders.read-deliveries-event@1',
        fn: OrdersState.readDeliveriesEvent,
        module: ORDERS,
        args: [Instant, DeliveriesOutboxEvent],
    },
    {
        id: 'orders.record-deliveries-event-read@1',
        fn: OrdersState.recordDeliveriesEventRead,
        module: ORDERS,
        args: [DeliveriesOutboxEvent, DeliveriesOutbox, OrdersRules],
    },
]);
