import { List } from 'immutable';

import {
    DISPATCH_PASS,
    DISPATCH_PASS_INTERVAL,
} from '../../domain/drivers/drivers-rule-definitions';
import { changesOf } from '../../domain/business-rules/parameter-change.testing';
import { DriverLocation, NewDriver } from '../../domain/drivers/driver';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toDriverId } from '../../domain/drivers/driver';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import {
    toIndirectLabel,
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { changeConfig } from '../../application-core/simulation-engine/config-change';
import { nextWork } from '../../application-core/simulation-engine/due-work';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { runNextWork } from '../../application-core/simulation-engine/run-step';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import type {
    IIndirectInput,
    IRulesInput,
    IRunInput,
    IRunStart,
    ScriptInput,
} from '../../application-core/simulation-engine/run-input';
import {
    ORDERS_INBOX_READ_LAG,
    ORDERS_READ_LAG,
} from '../../domain/orders/orders-rule-definitions';
import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import { toDegrees } from '../../domain/map-and-routing/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { SimTime, toSimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { latestPlace } from '../../application-core/simulation-engine/run-places';
import { forkAt, switchTo } from '../../application-core/simulation-engine/run-branches';
import { headAt } from '../../application-core/simulation-engine/commit-line';
import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { stateIndirectEffect } from '../../application-core/simulation-engine/indirect-commit';
import {
    DRIVER_IGNORES,
    RESTAURANT_LATE,
} from '../../application-core/simulation-engine/indirect-effects.testing';

const SECOND = 1000;
/** The one-order run's end, once the order is delivered. */
const END_MS = 300_000;
const TUNED_DISPATCH_PASS_MS = 20_000;
const TUNED_READ_LAG_MS = 30_000;
const FORKED_DISPATCH_PASS_MS = 15_000;
/** A fork starts after this part of the run: a third. */
const FORK_AT_PART = 3;
const RULES_STEP_MS = 3000;
const IGNORED_AT_MS = 45_000;
const LATE_AT_MS = 50_000;
const FOLLOWED_AT_S = 70;
const SEED = 42;
const RESTAURANT_LATITUDE = 10.33;
const DRIVER_LATITUDE = 10.331;
const LONGITUDE = 20.82;

const AREA = toAreaId('area-1');
const DRIVER: NewDriver = NewDriver.create({
    id: toDriverId('driver-1'),
    areaId: AREA,
    availability: 'Available',
    location: DriverLocation.create({
        coordinates: Coordinates.create({
            latitude: toDegrees(DRIVER_LATITUDE),
            longitude: toDegrees(LONGITUDE),
        }),
        deviceTime: toSimTime(0),
    }),
});
const THE_RESTAURANT = RestaurantPlace.create({
    id: toRestaurantId('restaurant-1'),
    areaId: AREA,
    coordinates: Coordinates.create({
        latitude: toDegrees(RESTAURANT_LATITUDE),
        longitude: toDegrees(LONGITUDE),
    }),
});
const START: IRunStart = {
    restaurants: List.of(THE_RESTAURANT),
    drivers: List.of(DRIVER),
};

const step = (atSeconds: number, actor: string, command: IRunInput['command']): IRunInput => ({
    at: toSimTime(atSeconds * SECOND),
    actor: toInputActor(actor),
    command,
    order: toInputOrderName('A'),
});

/** When each step of the one-order run happens, in seconds. */
const StepSeconds = {
    CreateOrder: 1,
    RequestDelivery: 2,
    MarkReady: 40,
    Accept: 60,
    PickUp: 120,
    Deliver: 240,
} as const;

/** One order on the V1.0.0 happy path, from creation to delivered. */
const ONE_ORDER = List<IRunInput>([
    step(StepSeconds.CreateOrder, 'restaurant-1', 'create-order'),
    step(StepSeconds.RequestDelivery, 'restaurant-1', 'request-delivery'),
    step(StepSeconds.MarkReady, 'restaurant-1', 'mark-ready'),
    step(StepSeconds.Accept, 'driver-1', 'accept'),
    step(StepSeconds.PickUp, 'driver-1', 'pick-up'),
    step(StepSeconds.Deliver, 'driver-1', 'deliver'),
]);

/** A run moved on through every piece of work due by a time, with the pure steps alone. */
export function advance(run: IRunState, until: number): IRunState {
    let state = run;
    while (nextWork(state).at.milliseconds <= until) {
        state = runNextWork(state);
    }
    return state;
}

/** The one-order run, started and not yet moved on. */
export function startedOneOrder(extraSteps: readonly ScriptInput[] = []): IRunState {
    const run = createRun({ seed: toSeed(SEED) });
    const steps = ONE_ORDER.concat(extraSteps);
    return scheduleInputs(run, START, steps);
}

/** The one-order run, moved on to a time, by default its end. */
export function oneOrderRun(until = END_MS): IRunState {
    const started = startedOneOrder();
    return advance(started, until);
}

/**
 * The one-order run with a refused call, a config change, and a script's step that changes rules,
 * run to its end, so its commits hold every kind of record a run makes today.
 */
export function variedRun(): IRunState {
    const refused = step(1, 'driver-1', 'accept');
    const lag = changesOf(ORDERS_INBOX_READ_LAG, ORDERS_READ_LAG, TUNED_READ_LAG_MS);
    const rulesStep: IRulesInput = { at: toSimTime(RULES_STEP_MS), changes: lag };
    const started = startedOneOrder([
        { ...refused, order: toInputOrderName('no-such-order') },
        rulesStep,
    ]);
    const early = advance(started, 2 * SECOND);
    const changes = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, TUNED_DISPATCH_PASS_MS);
    const at = toSimTime(2 * SECOND);
    const tuned = changeConfig(early, at, changes);
    return advance(tuned, END_MS);
}

/**
 * The varied run forked a third of the way in, with a faster dispatch pass, run on to its end:
 * Main and a fork that share their first commits (FND-87).
 */
export function forkedRun(): IRunState {
    const varied = variedRun();
    const latest = latestPlace(varied);
    const part = Math.floor(latest / FORK_AT_PART);
    const third = toPosition(part);
    const forked = forkAt(varied, third);
    const at = headAt(forked.line);
    const faster = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, FORKED_DISPATCH_PASS_MS);
    const forkTime = SimTime.from(at);
    const tuned = changeConfig(forked, forkTime, faster);
    return advance(tuned, END_MS);
}

/**
 * The one-order run with a scripted step where the driver ignores the request at 45 seconds, a
 * second accept that follows from it, and a restaurant running late stated by hand at 50
 * seconds: indirect commits the service does not see, run to its end (FND-89).
 */
export function indirectRun(): IRunState {
    const ignored: IIndirectInput = { at: toSimTime(IGNORED_AT_MS), indirect: DRIVER_IGNORES };
    const label = toIndirectLabel('ignored');
    const followed: IRunInput = { ...step(FOLLOWED_AT_S, 'driver-1', 'accept'), after: label };
    const started = startedOneOrder([ignored, followed]);
    const early = advance(started, LATE_AT_MS);
    const at = toSimTime(LATE_AT_MS);
    const stated = stateIndirectEffect(early, at, RESTAURANT_LATE);
    return advance(stated, END_MS);
}

/** The forked run back on Main, with the fork kept in its history. */
export function forkedRunBackOnMain(): IRunState {
    const forked = forkedRun();
    return switchTo(forked, MAIN_BRANCH);
}
