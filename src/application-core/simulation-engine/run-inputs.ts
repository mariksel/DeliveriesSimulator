import { List } from 'immutable';

import type { ParameterChange } from '../../domain/business-rules/parameter-change';

import { DriversState } from '../../domain/drivers/drivers-state';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { OrderId } from '../../domain/orders/order';
import { toDriverId } from '../../domain/drivers/driver';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import { OrdersState } from '../../domain/orders/orders-state';
import { unreachable } from '../../domain/system/validation/unreachable';
import type { CommandRefusal } from './command-outcome';
import { ScriptRefusal } from './command-outcome';
import { withDrivers, withStartValues } from './main-root';
import { changedValues } from './run-value-changes';
import type { ICommandDone } from './run-commands';
import {
    acceptRequest,
    applyOrdersStep,
    deliver,
    markReady,
    pickUp,
    requestDelivery,
} from './run-commands';
import type { ICause } from './run-log';
import type { RunLogRecord } from './run-log-entry';
import { lastSequence, NO_CAUSE, writeEntry } from './run-log';
import type { IRunState } from './run-state';
import { commitEffect, finishSession, startingFrom, startSession, withLog } from './run-state';
import type { InputResponse } from './direct-effect';
import { EffectKind } from './direct-effect';
import { InputCommand } from './input-command';
import type { IRunStart, IRunInput, ScriptInput } from './run-input';
import type { CommitId } from './commit-id';
import { required } from '../../domain/system/validation/required';
import { callState } from './state-call';
import type { LogSequence } from '../../domain/event-log/numbers';

const ACTORS = LogSource.Actors;

const NO_RULE_CHANGES = List<ParameterChange>();

/** A scripted step's command done, and the order it created, if it was a create order call. */
interface IInputDone extends ICommandDone {
    readonly orderId: OrderId | null;
}

const refused = (run: IRunState, refusal: ScriptRefusal): IInputDone => ({
    run,
    outcome: { isOk: false, refusal },
    orderId: null,
});

function assertCanSchedule(step: ScriptInput): void {
    if (!Number.isInteger(step.at.milliseconds)) {
        throw new RangeError(
            `Cannot schedule at ${step.at.milliseconds}: steps are at whole milliseconds.`,
        );
    }
}

/**
 * Sets up the starting state, with the start's rule changes in the values it starts with, and
 * gives the run its script. Steps run in time order, and steps due at the same time run in the
 * given order.
 */
export function scheduleInputs(
    run: IRunState,
    start: IRunStart,
    steps: List<ScriptInput>,
): IRunState {
    steps.forEach(assertCanSchedule);
    const drivers = start.drivers.reduce(DriversState.addDriver, run.root.state.drivers);
    const withStartDrivers = withDrivers(run.root, drivers);
    const rules = start.rules ?? NO_RULE_CHANGES;
    const { values } = changedValues(withStartDrivers.effects.direct.values, rules);
    const root = withStartValues(withStartDrivers, values);
    const scripted = run.script.steps.concat(steps);
    return {
        ...startingFrom(run, root),
        script: {
            restaurants: start.restaurants.reduce(
                (restaurants, restaurant) => restaurants.set(restaurant.id, restaurant),
                run.script.restaurants,
            ),
            steps: scripted.sortBy((step) => step.at.milliseconds),
        },
    };
}

/** The indirect commit a call follows from, by its label, or null when it names none. */
function followsFrom(run: IRunState, step: IRunInput): CommitId | null {
    if (step.after === undefined) {
        return null;
    }
    const commit = run.cache.indirectLabels.get(step.after);
    return required(commit, `the indirect commit labelled "${step.after}"`);
}

function createScriptedOrder(run: IRunState, step: IRunInput, cause: ICause): IInputDone {
    const restaurantId = toRestaurantId(step.actor);
    const restaurant = run.script.restaurants.get(restaurantId);
    if (restaurant === undefined) {
        return refused(run, ScriptRefusal.UnknownRestaurant);
    }
    if (run.cache.orderIds.has(step.order)) {
        return refused(run, ScriptRefusal.OrderAlreadyCreated);
    }
    const created = callState(OrdersState.createOrder, run.root.state.orders, step.at, restaurant);
    const applied = applyOrdersStep(run, created, cause);
    return { run: applied, outcome: { isOk: true }, orderId: created.result.order.id };
}

function performOnOrder(
    run: IRunState,
    step: IRunInput,
    command: Exclude<InputCommand, typeof InputCommand.CreateOrder>,
    orderId: OrderId,
    cause: ICause,
): ICommandDone {
    const now = step.at;
    switch (command) {
        case InputCommand.RequestDelivery:
            return requestDelivery(run, now, orderId, cause);
        case InputCommand.MarkReady:
            return markReady(run, now, orderId, cause);
        case InputCommand.Accept: {
            const driverId = toDriverId(step.actor);
            return acceptRequest(run, now, orderId, driverId, cause);
        }
        case InputCommand.PickUp: {
            const driverId = toDriverId(step.actor);
            return pickUp(run, now, orderId, driverId, cause);
        }
        case InputCommand.Deliver: {
            const driverId = toDriverId(step.actor);
            return deliver(run, now, orderId, driverId, cause);
        }
        default:
            return unreachable(command);
    }
}

function perform(run: IRunState, step: IRunInput, cause: ICause): IInputDone {
    if (step.command === InputCommand.CreateOrder) {
        return createScriptedOrder(run, step, cause);
    }
    const orderId = run.cache.orderIds.get(step.order);
    if (orderId === undefined) {
        return refused(run, ScriptRefusal.UnknownOrder);
    }
    const done = performOnOrder(run, step, step.command, orderId, cause);
    return { ...done, orderId: null };
}

function withRefusal(
    run: IRunState,
    step: IRunInput,
    refusal: CommandRefusal,
    sequence: LogSequence,
): IRunState {
    const record: RunLogRecord = {
        source: ACTORS,
        kind: TechnicalLogKind.CommandRefused,
        data: { actor: step.actor, name: step.command, refusal },
    };
    const log = writeEntry(run.cache.log, step.at, record, sequence, NO_CAUSE);
    return withLog(run, log);
}

const responseOf = (done: IInputDone): InputResponse =>
    done.outcome.isOk ? { isOk: true, orderId: done.orderId } : done.outcome;

/**
 * Logs a step's command, then performs it, so everything it causes traces back to it. A refusal is
 * logged too. The call ends in its input commit, whose response says what came of it.
 */
export function performInput(run: IRunState, step: IRunInput): IRunState {
    const at = step.at;
    const started = startSession(run, at);
    const record: RunLogRecord = {
        source: ACTORS,
        kind: TechnicalLogKind.CommandIssued,
        data: { actor: step.actor, name: step.command, data: { order: step.order } },
    };
    const issued = writeEntry(started.cache.log, at, record, undefined, NO_CAUSE);
    const sequence = lastSequence(issued);
    const withIssued = withLog(started, issued);
    const done = perform(withIssued, step, {
        current: sequence,
        isReadingInbox: false,
    });
    const logged = done.outcome.isOk
        ? done.run
        : withRefusal(done.run, step, done.outcome.refusal, sequence);
    const runState = commitEffect(logged, {
        kind: EffectKind.Input,
        at,
        actor: step.actor,
        command: step.command,
        order: step.order,
        response: responseOf(done),
        followsFrom: followsFrom(run, step),
    });
    return finishSession(runState);
}
