import type { List } from 'immutable';

import type { ICallOrders } from '../../domain/drivers/deliveries/call-orders';
import { DeliveriesState } from '../../domain/drivers/deliveries/deliveries-state';
import type {
    DriverCallResult,
    IDeliveriesAndDriversStep,
    IDeliveriesStep,
} from '../../domain/drivers/deliveries/deliveries-state';
import { DeliveryEventKind } from '../../domain/drivers/deliveries/delivery-event-kind';
import type { DriverCommandResult } from '../../domain/drivers/deliveries/deliveries-state';
import { FollowUpKind } from '../../domain/drivers/deliveries/follow-up-kind';
import type { OrdersAnswer } from '../../domain/drivers/deliveries/orders-answer';
import type { DriverId } from '../../domain/drivers/driver';
import type { OrderId } from '../../domain/orders/order';
import { OrdersState } from '../../domain/orders/orders-state';
import type { IOrdersStep, OrderCommandResult } from '../../domain/orders/orders-state';
import type { ISendHandoff } from '../../domain/orders/send-handoff';
import { required } from '../../domain/system/validation/required';
import { unreachable } from '../../domain/system/validation/unreachable';
import type { CommandOutcome } from './command-outcome';
import type { FollowUp } from './follow-up';
import { withDeliveries, withDrivers, withOrders } from './main-root';
import type { ICause } from './run-log';
import { writeDeliveriesReports, writeOrdersReports } from './run-log';
import type { IRunState } from './run-state';
import { commitTo, withLog } from './run-state';
import type { ICalled } from './state-call';
import { callState } from './state-call';
import type { SimTime } from '../../domain/simulation-engine/sim-time';

/** A run after a command, and what the command came to. */
export interface ICommandDone {
    readonly run: IRunState;
    readonly outcome: CommandOutcome;
}

const OK: CommandOutcome = { isOk: true };

/**
 * Takes a step of orders into the run: its new state, and what it did into the log. Its commit
 * holds the call that made it.
 */
export function applyOrdersStep(
    run: IRunState,
    called: ICalled<IOrdersStep>,
    cause: ICause,
): IRunState {
    const step = called.result;
    const root = withOrders(run.root, step.state);
    const log = writeOrdersReports(run.cache.log, step.reports, cause);
    const logged = withLog(run, log);
    return commitTo(logged, root, called.call);
}

/**
 * Takes a step of deliveries into the run: its new state, the drivers' state where it changed
 * them, and what it did into the log. Its commit holds the call that made it.
 */
export function applyDeliveriesStep(
    run: IRunState,
    called: ICalled<IDeliveriesStep | IDeliveriesAndDriversStep>,
    cause: ICause,
): IRunState {
    const step = called.result;
    const withNewDrivers = 'drivers' in step ? withDrivers(run.root, step.drivers) : run.root;
    const root = withDeliveries(withNewDrivers, step.state);
    const log = writeDeliveriesReports(run.cache.log, step.reports, cause);
    const logged = withLog(run, log);
    return commitTo(logged, root, called.call);
}

function sendHandoff(run: IRunState, followUp: ISendHandoff, cause: ICause): ICommandDone {
    const received = callState(
        DeliveriesState.receiveDeliveryRequest,
        run.root.state.deliveries,
        followUp.at,
        followUp.handoff,
    );
    const delivered = applyDeliveriesStep(run, received, cause);
    const completed = callState(
        OrdersState.completeHandoff,
        delivered.root.state.orders,
        followUp.at,
        followUp.handoff.orderId,
        received.result.orderDeliveryId,
    );
    return { run: applyOrdersStep(delivered, completed, cause), outcome: OK };
}

function ordersDecide(run: IRunState, call: ICallOrders): ICalled<OrderCommandResult> {
    const state = run.root.state.orders;
    switch (call.eventKind) {
        case DeliveryEventKind.OrderPickedUp:
            return callState(OrdersState.pickUp, state, call.at, call.orderId, call.driverId);
        case DeliveryEventKind.OrderDelivered:
            return callState(OrdersState.deliver, state, call.at, call.orderId, call.driverId);
        default:
            return unreachable(call.eventKind);
    }
}

/** What orders answered a call with: the event it recorded, or its refusal. */
function answerOf(
    result: OrderCommandResult,
    decided: IRunState,
    call: ICallOrders,
): OrdersAnswer {
    if (!result.isOk) {
        return { isOk: false, refusal: result.refusal };
    }
    const latest = decided.root.state.orders.latestEventOf(call.orderId);
    return { isOk: true, eventId: required(latest, `the latest event of ${call.orderId}`).id };
}

function callOrders(run: IRunState, call: ICallOrders, cause: ICause): ICommandDone {
    const decision = ordersDecide(run, call);
    const { result } = decision;
    const decided = result.isOk
        ? applyOrdersStep(run, { result, call: decision.call }, cause)
        : run;
    const answer = answerOf(result, decided, call);
    const finished = callState(
        DeliveriesState.answerFromOrders,
        decided.root.state.deliveries,
        decided.root.state.drivers,
        call,
        answer,
    );
    const answered = finished.result;
    if (!answered.isOk) {
        return { run: decided, outcome: { isOk: false, refusal: answered.refusal } };
    }
    const step = { result: answered, call: finished.call };
    return { run: applyDeliveriesStep(decided, step, cause), outcome: OK };
}

function carryOut(run: IRunState, followUp: FollowUp, cause: ICause): ICommandDone {
    switch (followUp.kind) {
        case FollowUpKind.SendHandoff:
            return sendHandoff(run, followUp, cause);
        case FollowUpKind.CallOrders:
            return callOrders(run, followUp, cause);
        default:
            return unreachable(followUp);
    }
}

/** Carries out a step's follow-ups, in order. The outcome is the last one's. */
export function carryOutAll(
    run: IRunState,
    followUps: List<FollowUp>,
    cause: ICause,
): ICommandDone {
    return followUps.reduce<ICommandDone>(
        (done, followUp) => carryOut(done.run, followUp, cause),
        {
            run,
            outcome: OK,
        },
    );
}

function afterOrders(
    run: IRunState,
    called: ICalled<OrderCommandResult>,
    cause: ICause,
): ICommandDone {
    const { result } = called;
    if (!result.isOk) {
        return { run, outcome: { isOk: false, refusal: result.refusal } };
    }
    const applied = applyOrdersStep(run, { result, call: called.call }, cause);
    return carryOutAll(applied, result.followUps, cause);
}

function afterDeliveries(
    run: IRunState,
    called: ICalled<DriverCommandResult | DriverCallResult>,
    cause: ICause,
): ICommandDone {
    const { result } = called;
    if (!result.isOk) {
        return { run, outcome: { isOk: false, refusal: result.refusal } };
    }
    const applied = applyDeliveriesStep(run, { result, call: called.call }, cause);
    return carryOutAll(applied, result.followUps, cause);
}

/** A restaurant asks for delivery. */
export function requestDelivery(
    run: IRunState,
    at: SimTime,
    orderId: OrderId,
    cause: ICause,
): ICommandDone {
    const requested = callState(OrdersState.requestDelivery, run.root.state.orders, at, orderId);
    return afterOrders(run, requested, cause);
}

/** A restaurant says an order is ready. */
export function markReady(
    run: IRunState,
    at: SimTime,
    orderId: OrderId,
    cause: ICause,
): ICommandDone {
    const marked = callState(OrdersState.markReady, run.root.state.orders, at, orderId);
    return afterOrders(run, marked, cause);
}

/** A driver accepts a request. */
export function acceptRequest(
    run: IRunState,
    at: SimTime,
    orderId: OrderId,
    driverId: DriverId,
    cause: ICause,
): ICommandDone {
    const accepted = callState(
        DeliveriesState.acceptRequest,
        run.root.state.deliveries,
        run.root.state.drivers,
        at,
        orderId,
        driverId,
        run.root.effects.direct.values.drivers,
    );
    return afterDeliveries(run, accepted, cause);
}

/** A driver picks an order up. */
export function pickUp(
    run: IRunState,
    at: SimTime,
    orderId: OrderId,
    driverId: DriverId,
    cause: ICause,
): ICommandDone {
    const pickedUp = callState(
        DeliveriesState.pickUp,
        run.root.state.deliveries,
        at,
        orderId,
        driverId,
    );
    return afterDeliveries(run, pickedUp, cause);
}

/** A driver delivers an order. */
export function deliver(
    run: IRunState,
    at: SimTime,
    orderId: OrderId,
    driverId: DriverId,
    cause: ICause,
): ICommandDone {
    const delivered = callState(
        DeliveriesState.deliver,
        run.root.state.deliveries,
        at,
        orderId,
        driverId,
    );
    return afterDeliveries(run, delivered, cause);
}
