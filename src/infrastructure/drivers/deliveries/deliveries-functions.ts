import { List } from 'immutable';

import { DeliveriesState } from '../../../domain/drivers/deliveries/deliveries-state';
import type { IRegisteredFunction } from '../../system/functions/registered-function';
import { ArgumentKind, StateModule } from '../../system/functions/registered-function';

const {
    Value,
    OrdersOutbox,
    OrdersOutboxEvent,
    DeliveriesRules,
    DriversRules,
    DriversState,
    Instant,
    CallOrders,
} = ArgumentKind;
const DELIVERIES = StateModule.Deliveries;

/**
 * The deliveries functions a state commit can hold, with their stored IDs. `pickUp` and `deliver`
 * are not here: they change no state, as the call to orders they ask for makes the commits.
 */
export const DELIVERIES_FUNCTIONS = List<IRegisteredFunction>([
    {
        id: 'drivers.deliveries.receive-delivery-request@1',
        fn: DeliveriesState.receiveDeliveryRequest,
        module: DELIVERIES,
        args: [Instant, ArgumentKind.DeliveryHandoff],
    },
    {
        id: 'drivers.deliveries.answer-from-orders@1',
        fn: DeliveriesState.answerFromOrders,
        module: DELIVERIES,
        args: [DriversState, CallOrders, Value],
    },
    {
        id: 'drivers.deliveries.accept-request@1',
        fn: DeliveriesState.acceptRequest,
        module: DELIVERIES,
        args: [DriversState, Instant, Value, Value, DriversRules],
    },

    {
        id: 'drivers.deliveries.notify-next-driver@1',
        fn: DeliveriesState.notifyNextDriver,
        module: DELIVERIES,
        args: [DriversState, Value, Instant, DriversRules],
    },
    {
        id: 'drivers.deliveries.read-orders-event@1',
        fn: DeliveriesState.readOrdersEvent,
        module: DELIVERIES,
        args: [DriversState, Instant, OrdersOutboxEvent],
    },
    {
        id: 'drivers.deliveries.record-orders-event-read@1',
        fn: DeliveriesState.recordOrdersEventRead,
        module: DELIVERIES,
        args: [OrdersOutboxEvent, OrdersOutbox, DeliveriesRules],
    },
]);
