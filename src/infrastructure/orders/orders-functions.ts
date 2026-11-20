import { List } from 'immutable';

import { OrdersState } from '../../domain/orders/orders-state';
import type { IRegisteredFunction } from '../system/functions/registered-function';
import { ArgumentKind, registered, StateModule } from '../system/functions/registered-function';
import { FIRST_VERSION } from '../../domain/system/records/version-chain';

const {
    Value,
    Instant,
    Maker,
    RestaurantPlace,
    DeliveryAddress,
    DeliveriesOutbox,
    DeliveriesOutboxEvent,
    OrdersRules,
} = ArgumentKind;
const ORDERS = StateModule.Orders;

/**
 * The orders functions a state commit can hold, with their stored IDs. `retryHandoffs` is not
 * here: it changes no state, as its follow-ups make the commits.
 */
export const ORDERS_FUNCTIONS = List<IRegisteredFunction>([
    registered({
        name: 'orders.create-order',
        version: FIRST_VERSION,
        fn: OrdersState.createOrder,
        module: ORDERS,
        args: [Instant, RestaurantPlace, DeliveryAddress, Maker],
    }),
    registered({
        name: 'orders.request-delivery',
        version: FIRST_VERSION,
        fn: OrdersState.requestDelivery,
        module: ORDERS,
        args: [Instant, Value, Maker],
    }),
    registered({
        name: 'orders.mark-ready',
        version: FIRST_VERSION,
        fn: OrdersState.markReady,
        module: ORDERS,
        args: [Instant, Value, Maker],
    }),
    registered({
        name: 'orders.pick-up',
        version: FIRST_VERSION,
        fn: OrdersState.pickUp,
        module: ORDERS,
        args: [Instant, Value, Value, Maker],
    }),
    registered({
        name: 'orders.deliver',
        version: FIRST_VERSION,
        fn: OrdersState.deliver,
        module: ORDERS,
        args: [Instant, Value, Value, Maker],
    }),
    registered({
        name: 'orders.complete-handoff',
        version: FIRST_VERSION,
        fn: OrdersState.completeHandoff,
        module: ORDERS,
        args: [Instant, Value, Value, Maker],
    }),
    registered({
        name: 'orders.read-deliveries-event',
        version: FIRST_VERSION,
        fn: OrdersState.readDeliveriesEvent,
        module: ORDERS,
        args: [Instant, DeliveriesOutboxEvent, Maker],
    }),
    registered({
        name: 'orders.record-deliveries-event-read',
        version: FIRST_VERSION,
        fn: OrdersState.recordDeliveriesEventRead,
        module: ORDERS,
        args: [DeliveriesOutboxEvent, DeliveriesOutbox, OrdersRules],
    }),
]);
