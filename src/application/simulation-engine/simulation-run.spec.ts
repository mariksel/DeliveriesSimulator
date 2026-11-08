import type { List } from 'immutable';
import { List as ImmutableList } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { IRunInput } from '../../application-core/simulation-engine/run-input';
import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { tunedDriversRules } from '../../domain/drivers/drivers-rules.testing';
import {
    DELIVERIES_INBOX,
    DELIVERIES_INBOX_INTERVAL,
} from '../../domain/drivers/deliveries/deliveries-rule-definitions';
import { tunedDeliveriesRules } from '../../domain/drivers/deliveries/deliveries-rules.testing';
import { ORDERS_INBOX, ORDERS_INBOX_INTERVAL } from '../../domain/orders/orders-rule-definitions';
import { tunedOrdersRules } from '../../domain/orders/orders-rules.testing';
import { toParameterValue } from '../../domain/business-rules/numbers';
import { ParameterChange } from '../../domain/business-rules/parameter-change';
import { changesOf } from '../../domain/business-rules/parameter-change.testing';
import { toRuleId } from '../../domain/business-rules/rule';
import {
    DELIVERIES_INBOX_READ_LAG,
    DELIVERIES_READ_LAG,
} from '../../domain/drivers/deliveries/deliveries-rule-definitions';
import {
    ORDERS_INBOX_READ_LAG,
    ORDERS_READ_LAG,
} from '../../domain/orders/orders-rule-definitions';
import { V1_DRIVERS_RULES } from '../../domain/drivers/drivers-rules';
import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toOrderEventId } from '../../domain/orders/order-event-id';
import { toOrderId } from '../../domain/orders/order';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { OrdersState } from '../../domain/orders/orders-state';
import { deepFrozen } from '../../domain/system/classes/deep-freeze.testing';
import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { checkDeterminism } from './determinism-check';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import { changeConfig } from '../../application-core/simulation-engine/config-change';
import { nextWork } from '../../application-core/simulation-engine/due-work';
import { withOrders } from '../../application-core/simulation-engine/main-root';
import { rebuildRunCache } from '../../application-core/simulation-engine/run-cache';
import { runShape } from '../../application-core/simulation-engine/run-shape.testing';
import type { IRunSettings, IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { runNextWork } from '../../application-core/simulation-engine/run-step';
import { RunJob, WorkKind } from '../../application-core/simulation-engine/run-work';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import { SimulationRun } from './simulation-run';
import { headAt, headRoot } from '../../application-core/simulation-engine/commit-line';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { DriverLocation, NewDriver } from '../../domain/drivers/driver';
import { toDegrees } from '../../domain/map-and-routing/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { V1_DELIVERIES_RULES } from '../../domain/drivers/deliveries/deliveries-rules';
import { V1_ORDERS_RULES } from '../../domain/orders/orders-rules';
import { toOrdersOutboxEventId } from '../../domain/orders/orders-outbox-event';

const ID = toOrderId('order-1');
const COORDINATES = Coordinates.create({
    latitude: toDegrees(10.33),
    longitude: toDegrees(20.82),
});
const RESTAURANT = RestaurantPlace.create({
    id: toRestaurantId('restaurant-1'),
    areaId: toAreaId('area-1'),
    coordinates: COORDINATES,
});
const SECOND = 1000;

function driverAt(
    name: string,
    latitude: number,
): Parameters<typeof scheduleInputs>[1]['drivers'] extends List<infer D> ? D : never {
    return NewDriver.create({
        id: toDriverId(name),
        areaId: toAreaId('area-1'),
        availability: 'Available',
        location: DriverLocation.create({
            coordinates: Coordinates.create({
                latitude: toDegrees(latitude),
                longitude: toDegrees(20.82),
            }),
            deviceTime: toSimTime(0),
        }),
    });
}

const NEAR_DRIVER = driverAt('driver-1', 10.331);
const CLOSEST_DRIVER = driverAt('c', 10.33);
const START = {
    restaurants: ImmutableList.of(RESTAURANT),
    drivers: ImmutableList.of(NEAR_DRIVER, CLOSEST_DRIVER),
};

const restaurant = (at: number, command: IRunInput['command'], order = 'A'): IRunInput => ({
    at: toSimTime(at),
    actor: toInputActor('restaurant-1'),
    command,
    order: toInputOrderName(order),
});
const driver = (at: number, command: IRunInput['command'], actor = 'driver-1'): IRunInput => ({
    at: toSimTime(at),
    actor: toInputActor(actor),
    command,
    order: toInputOrderName('A'),
});

const HAPPY_PATH = ImmutableList<IRunInput>([
    restaurant(1 * SECOND, 'create-order'),
    restaurant(2 * SECOND, 'request-delivery'),
    restaurant(40 * SECOND, 'mark-ready'),
    driver(60 * SECOND, 'accept'),
    driver(120 * SECOND, 'pick-up'),
    driver(240 * SECOND, 'deliver'),
]);

const ONLY_DRIVER = driverAt('driver-1', 10.331);
const ONLY_ONE_DRIVER = { ...START, drivers: ImmutableList.of(ONLY_DRIVER) };

function started(
    steps: List<IRunInput>,
    settings: IRunSettings = { seed: toSeed(1) },
    start: Parameters<typeof scheduleInputs>[1] = ONLY_ONE_DRIVER,
): SimulationRun {
    const run = createRun(settings);
    const runState = scheduleInputs(run, start, steps);
    return new SimulationRun(runState);
}

/** One order on the V1.0.0 happy path, through both modules and their jobs. */
function happyPath(seed = 1): SimulationRun {
    const run = started(HAPPY_PATH, { seed: toSeed(seed) });
    const time = toSimTime(300 * SECOND);
    run.advanceTo(time);
    return run;
}

const entriesOf = (run: SimulationRun): RunLogEntry[] => run.state.cache.log.entries.toArray();
const everyCommitOf = (run: SimulationRun): ICommit[] => run.line.commits.valueSeq().toArray();
const orderKinds = (state: IRunState): string[] =>
    state.root.state.orders
        .eventsOf(ID)
        .map((event) => event.kind)
        .toArray();
const deliveryKinds = (state: IRunState): string[] =>
    state.root.state.deliveries
        .eventsOf(ID)
        .map((event) => event.kind)
        .toArray();

function kinds(entries: readonly RunLogEntry[], source: string, kind?: string): string[] {
    return entries
        .filter((entry) => entry.source === source && (kind === undefined || entry.kind === kind))
        .map((entry) => entry.kind);
}

const isCommandNamed =
    (name: string) =>
    (entry: RunLogEntry): boolean =>
        entry.kind === 'CommandIssued' && (entry.data as { name: string }).name === name;

/**
 * A Domain instance forged on purpose, for a state a run cannot reach: it has this one's class
 * and fields, with some fields changed.
 */
function forged<TRecord extends object>(record: TRecord, changes: Partial<TRecord>): TRecord {
    const copy = Object.create(record) as TRecord;
    Object.entries(changes).forEach(([key, value]) => {
        Object.defineProperty(copy, key, { value, enumerable: true });
    });
    return copy;
}

describe('one order through both modules', () => {
    it('reaches Delivered in orders, at version 7', () => {
        const { state } = happyPath();

        const orderVersion = state.root.state.orders.orderVersionOf(ID);
        expect(orderVersion).toMatchObject({
            status: 'Delivered',
            number: 7,
            driverId: 'driver-1',
        });
    });

    describe("the driver's acceptance", () => {
        const acceptedAt1000 = ImmutableList<IRunInput>([
            restaurant(0, 'create-order'),
            restaurant(0, 'request-delivery'),
            driver(1000, 'accept', 'c'),
        ]);

        it('does not reach orders at once', () => {
            const run = started(acceptedAt1000, { seed: toSeed(1) }, START);

            const time = toSimTime(1000);
            run.advanceTo(time);

            expect(run.state.root.state.orders.orderVersionOf(ID)?.status).toBe(
                'DeliveryRequested',
            );
        });

        it('reaches orders through the inbox', () => {
            const run = started(acceptedAt1000, { seed: toSeed(1) }, START);

            const time = toSimTime(5000);
            run.advanceTo(time);

            const orderVersion = run.state.root.state.orders.orderVersionOf(ID);
            expect(orderVersion).toMatchObject({
                status: 'DriverAssigned',
                driverId: 'c',
            });
        });
    });

    it('records the same five event kinds in each module, linked to each other', () => {
        const { state } = happyPath();
        const expected = [
            'OrderDeliveryRequest',
            'OrderReady',
            'OrderDeliveryRequestAccepted',
            'OrderPickedUp',
            'OrderDelivered',
        ];
        const ordersIds = state.root.state.orders
            .eventsOf(ID)
            .map((event) => event.id)
            .toArray();
        const linked = state.root.state.deliveries
            .eventsOf(ID)
            .map((event) => state.root.state.deliveries.ordersEventOf(event))
            .toArray();

        const secondOrderKinds = orderKinds(state);
        expect(secondOrderKinds).toEqual(expected);
        const secondDeliveryKinds = deliveryKinds(state);
        expect(secondDeliveryKinds).toEqual(expected);
        expect(linked).toEqual(ordersIds);
    });

    it('writes one outbox event per event in each module, and no more', () => {
        const { state } = happyPath();
        const idsOf = (events: List<{ readonly id: string }>): string[] =>
            events
                .map((event) => event.id)
                .sort()
                .toArray();
        const eventIdsOf = (events: List<{ readonly eventId: string }>): string[] =>
            events
                .map((event) => event.eventId)
                .sort()
                .toArray();

        const eventIds = eventIdsOf(state.root.state.orders.outbox);
        const events = state.root.state.orders.eventsOf(ID);
        const expected = idsOf(events);
        expect(eventIds).toEqual(expected);
        const secondEventIds = eventIdsOf(state.root.state.deliveries.outbox);
        const deliveryEvents = state.root.state.deliveries.eventsOf(ID);
        const ids = idsOf(deliveryEvents);
        expect(secondEventIds).toEqual(ids);
    });

    it("writes the delivery request's outbox event only when deliveries acknowledges it", () => {
        const { state } = happyPath();

        const outbox = state.root.state.orders.outbox.first();
        expect(outbox).toMatchObject({
            kind: 'OrderDeliveryRequest',
            orderStatus: 'DeliveryRequested',
            orderVersion: 3,
        });
    });

    it('leaves the modules agreeing once events stop', () => {
        const { state } = happyPath();
        const order = state.root.state.orders.orderVersionOf(ID);
        const delivery = state.root.state.deliveries.deliveryVersionOf(ID);
        const copy = state.root.state.orders.deliveryCopyVersionOf(ID);

        expect(delivery?.state).toBe('Delivered');
        expect(delivery?.driverId).toBe(order?.driverId);
        expect(delivery?.orderCopy).toMatchObject({
            status: order?.status,
            version: order?.number,
        });
        expect(state.root.state.orders.deliveryCopyOf(ID)?.orderDeliveryId).toBe(
            state.root.state.deliveries.deliveryOf(ID)?.id,
        );
        const events = copy?.events.map((event) => event.eventId).toArray();
        const expected = state.root.state.deliveries
            .eventsOf(ID)
            .map((event) => event.id)
            .toArray();
        expect(events).toEqual(expected);
    });

    it('takes no event effect twice, though both inboxes keep running', () => {
        const run = happyPath();
        const before = run.state.cache.log.entries.size;

        const time = toSimTime(1000 * SECOND);
        run.advanceTo(time);

        expect(run.state.cache.log.entries.size).toBe(before);
        const secondOrderKinds = orderKinds(run.state);
        expect(secondOrderKinds).toHaveLength(5);
        const secondDeliveryKinds = deliveryKinds(run.state);
        expect(secondDeliveryKinds).toHaveLength(5);
    });

    it('notifies the eligible driver through the dispatch job', () => {
        const { state } = happyPath();

        const notifications = state.root.state.deliveries
            .notificationsOf(ID)
            .map((notification) => [notification.driverId, notification.at])
            .toArray();
        expect(notifications).toEqual([['driver-1', 30 * SECOND]]);
    });

    describe('a request whose handoff failed', () => {
        /**
         * The first retry has gone by, and then a request was saved, with its handoff never
         * carried out.
         */
        function requestedWithFailedHandoff(): SimulationRun {
            const scriptedStep = restaurant(0, 'create-order');
            const steps = ImmutableList.of(scriptedStep);
            const run = started(steps);
            const time = toSimTime(1);
            run.advanceTo(time);
            const at = toSimTime(1);
            const requested = OrdersState.requestDelivery(run.state.root.state.orders, at, ID);
            const orders = requested.isOk ? requested.state : run.state.root.state.orders;
            return new SimulationRun({ ...run.state, root: withOrders(run.state.root, orders) });
        }

        it('stays pending, with nothing in the outbox', () => {
            const { state } = requestedWithFailedHandoff();

            const orderVersion = state.root.state.orders.orderVersionOf(ID);
            expect(orderVersion).toMatchObject({
                status: 'Created',
                isDeliveryRequestPending: true,
                number: 2,
            });
            expect(state.root.state.orders.outbox.size).toBe(0);
        });

        it('stays pending until the next retry', () => {
            const run = requestedWithFailedHandoff();

            const time = toSimTime(4000);
            run.advanceTo(time);

            expect(run.state.root.state.orders.orderVersionOf(ID)?.isDeliveryRequestPending).toBe(
                true,
            );
        });

        it('completes on the next retry', () => {
            const run = requestedWithFailedHandoff();

            const time = toSimTime(5000);
            run.advanceTo(time);

            const orderVersion = run.state.root.state.orders.orderVersionOf(ID);
            expect(orderVersion).toMatchObject({
                status: 'DeliveryRequested',
                isDeliveryRequestPending: false,
                number: 3,
            });
            expect(run.state.root.state.orders.outbox.size).toBe(1);
        });
    });

    it('picks an event up later, if it was read before the order had a delivery', () => {
        const steps = ImmutableList<IRunInput>([
            restaurant(0, 'create-order'),
            restaurant(0, 'mark-ready'),
            restaurant(10_001, 'request-delivery'),
        ]);
        const run = started(steps);
        const time = toSimTime(10_000);
        run.advanceTo(time);
        const writtenBeforeRequest = run.state.root.state.orders.outbox.size;

        const secondTime = toSimTime(20_000);
        run.advanceTo(secondTime);

        expect(writtenBeforeRequest).toBe(1);
        const secondDeliveryKinds = deliveryKinds(run.state).sort();
        expect(secondDeliveryKinds).toEqual(['OrderDeliveryRequest', 'OrderReady']);
    });
});

describe('tuned values', () => {
    function notifiedAt(settings: IRunSettings): number[] {
        const scriptedStep = restaurant(0, 'create-order');
        const secondScriptedStep = restaurant(1, 'request-delivery');
        const onlyDriver = driverAt('c', 10.33);
        const steps = ImmutableList.of(scriptedStep, secondScriptedStep);
        const run = started(steps, settings, {
            ...START,
            drivers: ImmutableList.of(onlyDriver),
        });
        const time = toSimTime(100_000);
        run.advanceTo(time);
        return run.state.root.state.deliveries
            .notificationsOf(ID)
            .map((notification) => notification.at.sinceStart.milliseconds)
            .toArray();
    }

    it('use the V1.0.0 values by default', () => {
        const secondNotifiedAt = notifiedAt({ seed: toSeed(1) });
        expect(secondNotifiedAt).toEqual([30_000]);
    });

    it('reach the dispatch job', () => {
        const values = tunedDriversRules(
            V1_DRIVERS_RULES,
            DISPATCH_PASS,
            DISPATCH_PASS_INTERVAL,
            7000,
        );

        const secondNotifiedAt = notifiedAt({ seed: toSeed(1), driversRules: values });
        expect(secondNotifiedAt).toEqual([7000]);
    });

    describe('reach both inbox jobs', () => {
        function runOnTunedInbox(until: number): IRunState {
            const steps = ImmutableList<IRunInput>([
                restaurant(0, 'create-order'),
                restaurant(1, 'request-delivery'),
                restaurant(1, 'mark-ready'),
                driver(1, 'accept', 'c'),
            ]);
            const run = started(
                steps,
                {
                    seed: toSeed(1),
                    ordersRules: tunedOrdersRules(
                        V1_ORDERS_RULES,
                        ORDERS_INBOX,
                        ORDERS_INBOX_INTERVAL,
                        2000,
                    ),
                    deliveriesRules: tunedDeliveriesRules(
                        V1_DELIVERIES_RULES,
                        DELIVERIES_INBOX,
                        DELIVERIES_INBOX_INTERVAL,
                        2000,
                    ),
                },
                START,
            );
            const time = toSimTime(until);
            run.advanceTo(time);
            return run.state;
        }

        it('so nothing crosses before the job is due', () => {
            const state = runOnTunedInbox(1999);

            expect(state.root.state.orders.orderVersionOf(ID)?.status).toBe('DeliveryRequested');
            const secondDeliveryKinds = deliveryKinds(state);
            expect(secondDeliveryKinds).not.toContain('OrderReady');
        });

        it('so both directions cross when it is due', () => {
            const state = runOnTunedInbox(2000);

            expect(state.root.state.orders.orderVersionOf(ID)?.status).toBe('DriverAssigned');
            const secondDeliveryKinds = deliveryKinds(state);
            expect(secondDeliveryKinds).toContain('OrderReady');
        });
    });
});

describe('the commits of a run', () => {
    const commitsOf = (run: SimulationRun): ICommit[] => run.line.commits.valueSeq().toArray();
    const stateCommitsOf = (run: SimulationRun): ICommit[] =>
        commitsOf(run).filter((commit) => commit.kind === CommitKind.State);

    it('changes only its own sub-root in every commit of a run', () => {
        const run = started(HAPPY_PATH);
        const { start } = run.line;

        const time = toSimTime(300 * SECOND);
        run.advanceTo(time);

        const parents = [start, ...commitsOf(run).map((commit) => commit.root)];
        const changed = commitsOf(run).map((commit, index) => {
            const parent = parents[index]!;
            const isState = commit.kind === CommitKind.State;
            return (
                (commit.root.state !== parent.state) === isState &&
                (commit.root.effects !== parent.effects) !== isState
            );
        });
        const isEveryChanged = changed.every((isRight) => isRight);
        expect(isEveryChanged).toBe(true);
    });

    it('gives every state commit a state sub-root of its own', () => {
        const run = happyPath();
        const commits = stateCommitsOf(run);

        const secondCommits = commits.map((commit) => commit.root.state);
        expect(new Set(secondCommits).size).toBe(commits.length);
    });

    const commitsAt = (run: SimulationRun, at: number): ICommit[] =>
        stateCommitsOf(run).filter((commit) => commit.at.milliseconds === at);

    it('makes one commit for creating an order', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(1 * SECOND);
        run.advanceTo(time);

        const commits = commitsAt(run, 1 * SECOND);
        expect(commits).toHaveLength(1);
    });

    it('makes three commits for a delivery request: pending, received, and completed', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(2 * SECOND);
        run.advanceTo(time);

        const secondCommitsAt = commitsAt(run, 2 * SECOND).map((commit) => [
            commit.root.state.orders.orderVersionOf(ID)?.status,
            commit.root.state.orders.orderVersionOf(ID)?.isDeliveryRequestPending,
            commit.root.state.deliveries.deliveryVersionOf(ID)?.state,
        ]);
        expect(secondCommitsAt).toEqual([
            ['Created', true, undefined],
            ['Created', true, 'Requested'],
            ['DeliveryRequested', false, 'Requested'],
        ]);
    });

    it('makes two commits for each event an inbox job reads: the copy, then the inbox record', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(5 * SECOND);
        run.advanceTo(time);

        const secondCommitsAt = commitsAt(run, 5 * SECOND).map((commit) => [
            commit.root.state.orders.inbox.size,
            commit.root.state.deliveries.inbox.size,
            commit.root.state.orders.deliveryCopyVersionOf(ID)?.events.size,
        ]);
        expect(secondCommitsAt).toEqual([
            [0, 0, 1],
            [1, 0, 1],
            [1, 0, 1],
            [1, 1, 1],
        ]);
    });

    it('makes one commit for each notification a dispatch pass sends', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(30 * SECOND);
        run.advanceTo(time);

        const commits = commitsAt(run, 30 * SECOND);
        expect(commits).toHaveLength(1);
    });

    it('makes two commits for a pickup until its pending request exists: orders, then deliveries', () => {
        const steps = ImmutableList<IRunInput>([
            restaurant(1 * SECOND, 'create-order'),
            restaurant(2 * SECOND, 'request-delivery'),
            restaurant(40 * SECOND, 'mark-ready'),
            driver(60 * SECOND, 'accept'),
            driver(121 * SECOND, 'pick-up'),
        ]);
        const run = started(steps);

        const time = toSimTime(121 * SECOND);
        run.advanceTo(time);

        const secondCommitsAt = commitsAt(run, 121 * SECOND).map((commit) => [
            commit.root.state.orders.orderVersionOf(ID)?.status,
            commit.root.state.deliveries.deliveryVersionOf(ID)?.state,
        ]);
        expect(secondCommitsAt).toEqual([
            ['PickedUp', 'Assigned'],
            ['PickedUp', 'PickedUp'],
        ]);
    });

    it('makes a job commit for every job run, even one that finds nothing to do', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);

        const time = toSimTime(5 * SECOND);
        run.advanceTo(time);

        const commits = commitsOf(run).map((commit) => commit.effect);
        const expected = [
            [0, RunJob.OrdersInbox],
            [0, RunJob.HandoffRetry],
            [0, RunJob.DeliveriesInbox],
            [0, RunJob.DispatchPass],
            [5 * SECOND, RunJob.OrdersInbox],
            [5 * SECOND, RunJob.HandoffRetry],
            [5 * SECOND, RunJob.DeliveriesInbox],
        ].map(([at, job]) => ({ kind: EffectKind.Job, at, job, stateCommits: 0 }));
        expect(commits).toEqual(expected);
    });

    it('makes no state commit for a job run that finds nothing to do', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);

        const time = toSimTime(60 * SECOND);
        run.advanceTo(time);

        const stateCommits = stateCommitsOf(run);
        expect(stateCommits).toEqual([]);
    });

    it('says how many state commits a job run made', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(5 * SECOND);
        run.advanceTo(time);

        const runs = commitsOf(run).flatMap((commit) =>
            commit.effect?.kind === EffectKind.Job && commit.at.milliseconds === 5 * SECOND
                ? [commit.effect]
                : [],
        );
        const secondRuns = runs.map((effect) => [effect.job, effect.stateCommits]);
        expect(secondRuns).toEqual([
            [RunJob.OrdersInbox, 2],
            [RunJob.HandoffRetry, 0],
            [RunJob.DeliveriesInbox, 2],
        ]);
    });

    it('makes an input commit for each API call, with its request and response', () => {
        const scriptedStep = restaurant(1 * SECOND, 'create-order');
        const steps = ImmutableList.of(scriptedStep);
        const run = started(steps);

        const time = toSimTime(1 * SECOND);
        run.advanceTo(time);

        expect(commitsOf(run).find((commit) => commit.kind === CommitKind.Input)?.effect).toEqual({
            kind: EffectKind.Input,
            at: 1 * SECOND,
            actor: toInputActor('restaurant-1'),
            command: 'create-order',
            order: toInputOrderName('A'),
            response: { isOk: true, orderId: ID },
            followsFrom: null,
        });
    });

    it('records a refused call as an input commit with its refusal, and no state commit', () => {
        const scriptedStep = driver(1 * SECOND, 'accept');
        const steps = ImmutableList.of(scriptedStep);
        const run = started(steps);

        const time = toSimTime(1 * SECOND);
        run.advanceTo(time);

        expect(commitsOf(run).at(-1)?.effect).toMatchObject({
            kind: EffectKind.Input,
            response: { isOk: false, refusal: 'UnknownOrder' },
        });
        const stateCommits = stateCommitsOf(run);
        expect(stateCommits).toEqual([]);
    });

    it('groups an API call with the state commits made while handling it, ending with the call', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(2 * SECOND);
        run.advanceTo(time);

        const call = commitsOf(run).filter((commit) => commit.at.milliseconds === 2 * SECOND);
        const secondCall = call.map((commit) => commit.kind);
        expect(secondCall).toEqual([
            CommitKind.State,
            CommitKind.State,
            CommitKind.State,
            CommitKind.Input,
        ]);
        const thirdCall = call.map((commit) => commit.session);
        expect(new Set(thirdCall).size).toBe(1);
    });

    it('groups a job run with the state commits it made, apart from other job runs', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(5 * SECOND);
        run.advanceTo(time);

        const at5 = commitsOf(run).filter((commit) => commit.at.milliseconds === 5 * SECOND);
        const secondAt5 = at5.map((commit) => commit.kind);
        expect(secondAt5).toEqual([
            CommitKind.State,
            CommitKind.State,
            CommitKind.Job,
            CommitKind.Job,
            CommitKind.State,
            CommitKind.State,
            CommitKind.Job,
        ]);
        const thirdAt5 = at5.map((commit) => commit.session);
        expect(new Set(thirdAt5).size).toBe(3);
    });

    it('makes no commit for a call between the modules', () => {
        const run = started(HAPPY_PATH);

        const time = toSimTime(2 * SECOND);
        run.advanceTo(time);

        const secondCommits = commitsOf(run).filter(
            (commit) => commit.at.milliseconds === 2 * SECOND,
        );
        expect(secondCommits).toHaveLength(4);
    });

    it('has no group open between pieces of work', () => {
        expect(happyPath().line.session).toBeNull();
    });

    it('keeps each commit at the state it reached, as the run goes on', () => {
        const run = happyPath();

        const statuses = stateCommitsOf(run).map(
            (commit) => commit.root.state.orders.orderVersionOf(ID)?.status,
        );

        expect(statuses[0]).toBe('Created');
        expect(statuses).toContain('DriverAssigned');
        const statuse = statuses.at(-1);
        expect(statuse).toBe('Delivered');
    });

    it('stamps each commit with the simulated time it happened', () => {
        const run = happyPath();
        const commits = commitsOf(run);

        const simulationRun = happyPath();
        expect(stateCommitsOf(simulationRun)[0]?.at.milliseconds).toBe(1 * SECOND);
        const secondCommits = commits.map((commit) => commit.at);
        const expected = commits
            .map((commit) => commit.at)
            .toSorted((first, second) => first.milliseconds - second.milliseconds);
        expect(secondCommits).toEqual(expected);
    });

    it('has reached the same root as the run', () => {
        const run = happyPath();

        const mainRoot = headRoot(run.line);
        expect(mainRoot).toBe(run.state.root);
    });

    it('starts from the root the run started with', () => {
        const run = createRun({ seed: toSeed(1) });
        const start = scheduleInputs(run, ONLY_ONE_DRIVER, HAPPY_PATH);

        expect(new SimulationRun(start).line.start).toBe(start.root);
    });

    it('gives the same commits on the same run', () => {
        const times = (run: SimulationRun): number[] =>
            commitsOf(run).map((commit) => commit.at.milliseconds);

        const run = happyPath();
        const simulationRun = happyPath();
        const secondTimes = times(run);
        const expected = times(simulationRun);
        expect(secondTimes).toEqual(expected);
    });
});

describe('the log of the run', () => {
    it('holds every event, outbox write, inbox read, and command, in time order', () => {
        const run = happyPath();
        const entries = entriesOf(run);
        const { orders, deliveries } = run.state.root.state;

        const secondKinds = kinds(entries, 'actors');
        expect(secondKinds).toHaveLength(6);
        const thirdKinds = kinds(entries, 'orders', 'OrderCreated');
        expect(thirdKinds).toHaveLength(1);
        const fourthKinds = kinds(entries, 'deliveries', 'NotificationSent');
        expect(fourthKinds).toHaveLength(1);
        const fifthKinds = kinds(entries, 'orders', 'OutboxEventWritten');
        expect(fifthKinds).toHaveLength(orders.outbox.size);
        const sixthKinds = kinds(entries, 'deliveries', 'OutboxEventWritten');
        expect(sixthKinds).toHaveLength(deliveries.outbox.size);
        const seventhKinds = kinds(entries, 'orders', 'InboxEventRead');
        expect(seventhKinds).toHaveLength(deliveries.outbox.size);
        const eighthKinds = kinds(entries, 'deliveries', 'InboxEventRead');
        expect(eighthKinds).toHaveLength(orders.outbox.size);
        const map = entries.map((entry) => entry.at);
        const expected = entries
            .map((entry) => entry.at)
            .toSorted(
                (first, second) => first.sinceStart.milliseconds - second.sinceStart.milliseconds,
            );
        expect(map).toEqual(expected);
    });

    it("traces the driver's acceptance from the command to orders, through outbox and inbox", () => {
        const run = happyPath();
        const logEntries = entriesOf(run);
        const predicate = isCommandNamed('accept');
        const command = logEntries.find(predicate)!;
        const chain = logEntries.filter((entry) => entry.trace === command.sequence);

        const secondChain = chain.slice(0, 5).map((entry) => [entry.source, entry.kind]);
        expect(secondChain).toEqual([
            ['actors', 'CommandIssued'],
            ['deliveries', 'OrderDeliveryRequestAccepted'],
            ['deliveries', 'OutboxEventWritten'],
            ['orders', 'InboxEventRead'],
            ['orders', 'OrderDeliveryRequestAccepted'],
        ]);
        // Each step is caused by exactly the one before it.
        const thirdChain = chain.slice(1, 5).map((entry) => entry.causedBy);
        const expected = chain.slice(0, 4).map((entry) => entry.sequence);
        expect(thirdChain).toEqual(expected);
    });

    it('traces a ready order into deliveries, through its inbox', () => {
        const run = happyPath();
        const logEntries = entriesOf(run);
        const predicate = isCommandNamed('mark-ready');
        const command = logEntries.find(predicate)!;
        const chain = logEntries.filter((entry) => entry.trace === command.sequence);

        const secondChain = chain.slice(0, 5).map((entry) => [entry.source, entry.kind]);
        expect(secondChain).toEqual([
            ['actors', 'CommandIssued'],
            ['orders', 'OrderReady'],
            ['orders', 'OutboxEventWritten'],
            ['deliveries', 'InboxEventRead'],
            ['deliveries', 'OrderReady'],
        ]);
        const thirdChain = chain.slice(1, 5).map((entry) => entry.causedBy);
        const expected = chain.slice(0, 4).map((entry) => entry.sequence);
        expect(thirdChain).toEqual(expected);
    });

    it('traces a pickup from the command through the direct call', () => {
        const run = happyPath();
        const logEntries = entriesOf(run);
        const predicate = isCommandNamed('pick-up');
        const command = logEntries.find(predicate)!;
        const traced = logEntries.filter((entry) => entry.trace === command.sequence);
        const inOrders = traced.find(
            (entry) => entry.source === 'orders' && entry.kind === 'OrderPickedUp',
        )!;
        const inDeliveries = traced.find(
            (entry) => entry.source === 'deliveries' && entry.kind === 'OrderPickedUp',
        )!;

        const secondTraced = traced.slice(0, 3).map((entry) => [entry.source, entry.kind]);
        expect(secondTraced).toEqual([
            ['actors', 'CommandIssued'],
            ['orders', 'OrderPickedUp'],
            ['orders', 'OutboxEventWritten'],
        ]);
        expect(inOrders.causedBy).toBe(command.sequence);
        expect(traced[2]?.causedBy).toBe(inOrders.sequence);
        // The direct call's answer causes the event in deliveries.
        expect(inDeliveries.causedBy).toBe(inOrders.sequence);
    });

    it("traces the notification back to the restaurant's request", () => {
        const run = happyPath();
        const logEntries = entriesOf(run);
        const notification = logEntries.find((entry) => entry.kind === 'NotificationSent')!;
        const root = logEntries[notification.trace]!;

        expect((root.data as { name: string }).name).toBe('request-delivery');
    });

    it('repeats exactly from the same seed', () => {
        const runDifference = checkDeterminism(() => happyPath(42).state.cache.log.entries);
        expect(runDifference).toBeNull();
    });
});

describe('a step of a run', () => {
    it('is pure: it gives the same next state from the same state, however often it is asked', () => {
        const start = deepFrozen(started(HAPPY_PATH).state);

        const once = runNextWork(start);
        const again = runNextWork(start);

        const text = runShape(again);
        const expected = runShape(once);
        expect(text).toEqual(expected);
    });

    it('leaves the state it was given as it was', () => {
        const start = deepFrozen(started(HAPPY_PATH).state);
        const before = runShape(start);

        runNextWork(start);

        const text = runShape(start);
        expect(text).toEqual(before);
    });

    it('holds no waiting work: only the script, its branches, its line of commits, its root, and the cache', () => {
        const { state } = started(HAPPY_PATH);

        const fields = Object.keys(state);
        expect(fields).toEqual(['script', 'history', 'line', 'root', 'cache']);
    });

    it('works the next work out as a record', () => {
        const { state } = started(HAPPY_PATH);

        const due = nextWork(state);

        expect(due).toEqual({ at: 0, work: { kind: WorkKind.Job, job: RunJob.OrdersInbox } });
    });

    it('repeats a job after its interval, from its latest run', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);

        const time = toSimTime(0);
        run.advanceTo(time);

        const due = nextWork(run.state);
        expect(due).toEqual({
            at: V1_ORDERS_RULES.inboxJobMs,
            work: { kind: WorkKind.Job, job: RunJob.OrdersInbox },
        });
    });

    it('runs every job before the steps at time 0, and the steps first after that', () => {
        const create = restaurant(0, 'create-order');
        const ready = restaurant(5 * SECOND, 'mark-ready');
        const steps = ImmutableList.of(create, ready);
        const run = started(steps);

        const time = toSimTime(5 * SECOND);
        run.advanceTo(time);

        const order = everyCommitOf(run)
            .filter((commit) => commit.kind !== CommitKind.State)
            .map((commit) =>
                commit.effect?.kind === EffectKind.Job ? commit.effect.job : commit.kind,
            );
        expect(order).toEqual([
            RunJob.OrdersInbox,
            RunJob.HandoffRetry,
            RunJob.DeliveriesInbox,
            RunJob.DispatchPass,
            CommitKind.Input,
            CommitKind.Input,
            RunJob.OrdersInbox,
            RunJob.HandoffRetry,
            RunJob.DeliveriesInbox,
        ]);
    });

    it('runs jobs due together in the order of their latest runs', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);

        const time = toSimTime(30 * SECOND);
        run.advanceTo(time);

        const atThirty = everyCommitOf(run)
            .filter((commit) => commit.at.milliseconds === 30 * SECOND)
            .map((commit) => (commit.effect?.kind === EffectKind.Job ? commit.effect.job : null));
        expect(atThirty).toEqual([
            RunJob.DispatchPass,
            RunJob.OrdersInbox,
            RunJob.HandoffRetry,
            RunJob.DeliveriesInbox,
        ]);
    });

    it('takes the steps in time order, keeping the given order for steps at the same time', () => {
        const later = restaurant(2 * SECOND, 'mark-ready');
        const first = restaurant(SECOND, 'create-order', 'B');
        const second = restaurant(SECOND, 'create-order', 'C');
        const steps = ImmutableList.of(later, first, second);

        const run = started(steps);

        const orders = run.state.script.steps
            .map((step) => ('order' in step ? step.order : null))
            .toArray();
        expect(orders).toEqual(['B', 'C', 'A']);
    });

    it('refuses a step at a part millisecond, which a run cannot schedule', () => {
        const run = createRun({ seed: toSeed(1) });
        const step = restaurant(0.5, 'create-order');
        const steps = ImmutableList.of(step);

        expect(() => scheduleInputs(run, ONLY_ONE_DRIVER, steps)).toThrow(RangeError);
    });
});

describe('the cache beside the line of commits', () => {
    it('is worked out again from the commits exactly', () => {
        const { state } = happyPath();

        const entries = ImmutableList<RunLogEntry>();
        const rebuilt = rebuildRunCache(state.line, entries);

        expect(rebuilt).toEqual(state.cache);
    });

    it('gives the log as every commit holds it, in order', () => {
        const { state } = happyPath();

        const fromCommits = state.line.commits
            .valueSeq()
            .flatMap((commit) => commit.entries)
            .toArray();

        const logged = state.cache.log.entries.toArray();
        expect(fromCommits).toEqual(logged);
    });

    it('finds an order by the name the scenario gave it', () => {
        const { state } = happyPath();

        const input = state.line.commits
            .valueSeq()
            .find((commit) => commit.effect?.kind === EffectKind.Input);

        expect(input?.effect).toMatchObject({ response: { isOk: true, orderId: ID } });
        const name = toInputOrderName('A');
        const found = state.cache.orderIds.get(name);
        expect(found).toBe(ID);
    });

    it('counts the scripted steps that have run', () => {
        const { state } = happyPath();

        expect(state.cache.stepsRun).toBe(HAPPY_PATH.size);
    });
});

describe('a config change', () => {
    const faster = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, 10 * SECOND);
    const fasterDrivers = tunedDriversRules(
        V1_DRIVERS_RULES,
        DISPATCH_PASS,
        DISPATCH_PASS_INTERVAL,
        10 * SECOND,
    );

    it('is a direct effect commit, holding the values before and after', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(SECOND);
        run.advanceTo(time);

        run.changeConfig(faster);

        const commit = everyCommitOf(run).at(-1);
        expect(commit).toMatchObject({
            kind: CommitKind.ConfigChange,
            at: SECOND,
            session: null,
            effect: { before: { drivers: V1_DRIVERS_RULES } },
        });
        const isAfterFaster =
            commit?.effect?.kind === EffectKind.ConfigChange &&
            commit.effect.after.drivers.equals(fasterDrivers);
        expect(isAfterFaster).toBe(true);
    });

    it('writes a ConfigChanged entry with each changed value before and after, held by its commit', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(SECOND);
        run.advanceTo(time);

        run.changeConfig(faster);

        const entry = run.state.cache.log.entries.last();
        expect(entry).toMatchObject({
            at: SECOND,
            source: 'simulation-engine',
            kind: 'ConfigChanged',
            causedBy: null,
        });
        const changes = entry?.kind === 'ConfigChanged' ? entry.data.changes.toArray() : [];
        expect(changes).toEqual([
            {
                ruleId: 'drivers.dispatch-pass',
                parameterId: 'interval',
                before: 30_000,
                after: 10 * SECOND,
            },
        ]);
        const commit = everyCommitOf(run).at(-1);
        const held = commit?.entries.toArray();
        expect(held).toEqual([entry]);
    });

    it('puts the new values in use, in the direct part', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(SECOND);
        run.advanceTo(time);

        run.changeConfig(faster);

        const { values } = run.state.root.effects.direct;
        const isFaster = values.drivers.equals(fasterDrivers);
        expect(isFaster).toBe(true);
        expect(values.orders).toBe(V1_ORDERS_RULES);
        expect(values.deliveries).toBe(V1_DELIVERIES_RULES);
    });

    it("sends each change to the module that holds the change's rule", () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(SECOND);
        run.advanceTo(time);
        const ordersLag = changesOf(ORDERS_INBOX_READ_LAG, ORDERS_READ_LAG, 1000);
        const deliveriesLag = changesOf(DELIVERIES_INBOX_READ_LAG, DELIVERIES_READ_LAG, 2000);
        const both = ordersLag.concat(deliveriesLag);

        run.changeConfig(both);

        const { values } = run.state.root.effects.direct;
        expect(values.orders.readLagMs.milliseconds).toBe(1000);
        expect(values.deliveries.readLagMs.milliseconds).toBe(2000);
        expect(values.drivers).toBe(V1_DRIVERS_RULES);
    });

    it('refuses a change to a rule no module holds, and changes nothing', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(SECOND);
        run.advanceTo(time);
        const unknown = toRuleId('payments.commission');
        const value = toParameterValue(1);
        const change = ParameterChange.create({
            ruleId: unknown,
            parameterId: DISPATCH_PASS_INTERVAL.id,
            value,
        });
        const changes = ImmutableList([change]);

        expect(() => {
            run.changeConfig(changes);
        }).toThrow('No module has a rule payments.commission.');
        const { values } = run.state.root.effects.direct;
        expect(values.drivers).toBe(V1_DRIVERS_RULES);
    });

    it('moves a job on to its new interval, from its latest run', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(SECOND);
        run.advanceTo(time);

        run.changeConfig(faster);
        const secondTime = toSimTime(10 * SECOND);
        run.advanceTo(secondTime);

        const passes = everyCommitOf(run)
            .filter(
                (commit) =>
                    commit.effect?.kind === EffectKind.Job &&
                    commit.effect.job === RunJob.DispatchPass,
            )
            .map((commit) => commit.at);
        expect(passes).toEqual([0, 10 * SECOND]);
    });

    it('runs a job at once when its new interval has already passed', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(20 * SECOND);
        run.advanceTo(time);

        run.changeConfig(faster);

        expect(run.nextAt.milliseconds).toBe(20 * SECOND);
    });

    it('refuses a time before the latest commit', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(6 * SECOND);
        run.advanceTo(time);
        const latest = headAt(run.line);
        expect(latest.milliseconds).toBeGreaterThan(0);

        const before = toSimTime(latest.milliseconds - 1);

        expect(() => changeConfig(run.state, before, faster)).toThrow(RangeError);
    });

    it('refuses a time with work still due before it', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(SECOND);
        run.advanceTo(time);

        const later = toSimTime(6 * SECOND);

        expect(() => changeConfig(run.state, later, faster)).toThrow(RangeError);
    });
});

describe('a bug inside a run', () => {
    /**
     * An event deliveries cannot handle, waiting in the orders outbox for the inbox job at 5000.
     */
    function runWithABug(): SimulationRun {
        const scriptedStep = restaurant(0, 'create-order');
        const secondScriptedStep = restaurant(1, 'request-delivery');
        const steps = ImmutableList.of(scriptedStep, secondScriptedStep);
        const run = started(steps);
        const time = toSimTime(4000);
        run.advanceTo(time);
        const { orders } = run.state.root.state;
        const first = orders.outbox.first()!;
        const bad = forged(first, {
            id: toOrdersOutboxEventId('bad'),
            kind: 'Unknown' as never,
            eventId: toOrderEventId('bad'),
        });
        const outbox = orders.outbox.push(bad);
        const withBad = forged(orders, { outbox });
        return new SimulationRun({ ...run.state, root: withOrders(run.state.root, withBad) });
    }

    it('stops the run, and shows where', () => {
        const run = runWithABug();

        const time = toSimTime(10_000);
        run.advanceTo(time);

        expect(run.failure).toMatchObject({
            at: 5000,
            work: { kind: WorkKind.Job, job: RunJob.DeliveriesInbox },
            message: 'Deliveries does not handle Unknown yet.',
        });
    });

    it('leaves the last good state', () => {
        const run = runWithABug();
        const before = run.state.cache.log.entries.size;

        const time = toSimTime(10_000);
        run.advanceTo(time);

        expect(run.state.cache.log.entries.size).toBeGreaterThanOrEqual(before);
        const latest = headAt(run.state.line);
        expect(latest.milliseconds).toBe(5000);
    });

    it('stays stopped', () => {
        const run = runWithABug();
        const time = toSimTime(10_000);
        run.advanceTo(time);
        const { state } = run;

        const didRun = run.runNext();

        expect(didRun).toBe(false);
        expect(run.state).toBe(state);
    });

    it('does not move the clock on', () => {
        const run = runWithABug();
        const time = toSimTime(10_000);
        run.advanceTo(time);

        const secondTime = toSimTime(20_000);
        run.advanceTo(secondTime);

        expect(run.now.milliseconds).toBe(5000);
    });

    it('keeps a message for something thrown that is not an error', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const orders = forged(run.state.root.state.orders, {});
        Object.defineProperty(orders, 'inboxPosition', {
            get(): never {
                // eslint-disable-next-line @typescript-eslint/only-throw-error -- this test needs it.
                throw 'not an error';
            },
        });
        const broken = new SimulationRun({
            ...run.state,
            root: withOrders(run.state.root, orders),
        });

        broken.runNext();

        expect(broken.failure?.message).toBe('not an error');
    });
});

describe('the service driving a run', () => {
    it('starts its clock at the latest commit of the run it is given', () => {
        const run = happyPath();

        const resumed = new SimulationRun(run.state);

        const latest = headAt(run.state.line);
        expect(resumed.now).toBe(latest);
    });

    it('refuses to go back in time', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);
        const time = toSimTime(10);
        run.advanceTo(time);

        expect(() => {
            const time = toSimTime(9);
            run.advanceTo(time);
        }).toThrow(RangeError);
    });

    it('refuses a time that is not whole, before running any work', () => {
        const scriptedStep = restaurant(0, 'create-order');
        const steps = ImmutableList.of(scriptedStep);
        const run = started(steps);

        expect(() => {
            const time = toSimTime(1000.5);
            run.advanceTo(time);
        }).toThrow(RangeError);
        expect(run.state.cache.log.entries.size).toBe(0);
    });

    it('stays at the time it was asked for, between pieces of work', () => {
        const steps = ImmutableList<IRunInput>();
        const run = started(steps);

        const time = toSimTime(1234);
        run.advanceTo(time);

        expect(run.now.milliseconds).toBe(1234);
    });
});
