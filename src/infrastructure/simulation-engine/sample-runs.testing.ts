import { DEFAULT_BLOCK_METRES } from '../../domain/map-and-routing/city';
import { toCitySeed } from '../../domain/map-and-routing/numbers';
import { FunctionName } from '../../application-core/simulation-engine/function-name';
import { switchVersions } from '../../application-core/simulation-engine/implementation-change';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { REGISTERED_FUNCTIONS } from './function-registry';
import { List } from 'immutable';
import {
    TEST_ADDRESS,
    TEST_CUSTOMER,
    toTestAddress,
} from '../../application-core/simulation-engine/run-customers.testing';
import {
    DEFAULT_SEND_EVERY,
    DEFAULT_SPEED_KMH,
} from '../../application-core/simulation-engine/rider';

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
    IUseInput,
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
import { toDegrees, toKilometres } from '../../domain/map-and-routing/numbers';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { SimTime, toSimTime } from '../../domain/simulation-engine/sim-time';
import { toCount, toPosition } from '../../domain/system/math/math';
import { latestPlace } from '../../application-core/simulation-engine/run-places';
import { forkAt, switchTo } from '../../application-core/simulation-engine/run-branches';
import { headAt } from '../../application-core/simulation-engine/commit-line';
import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { stateIndirectEffect } from '../../application-core/simulation-engine/indirect-commit';
import {
    DRIVER_IGNORES,
    RESTAURANT_LATE,
} from '../../application-core/simulation-engine/indirect-effects.testing';
import { City } from '../../domain/map-and-routing/city';

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
const CORNER_LATITUDE = 10.325;
const CORNER_LONGITUDE = 20.815;
const CITY_KM = 2;
const AREAS_EACH_WAY = 2;
const CITY_SEED = 7;

/**
 * The city the sample runs happen in: the one-order scenario's, four 1 km areas with the
 * restaurant and driver in area-1 (FND-90).
 */
export const SAMPLE_CITY = City.createNew({
    origin: Coordinates.create({
        latitude: toDegrees(CORNER_LATITUDE),
        longitude: toDegrees(CORNER_LONGITUDE),
    }),
    widthKm: toKilometres(CITY_KM),
    heightKm: toKilometres(CITY_KM),
    across: toCount(AREAS_EACH_WAY),
    down: toCount(AREAS_EACH_WAY),
    seed: toCitySeed(CITY_SEED),
    blockMetres: DEFAULT_BLOCK_METRES,
});

const START: IRunStart = {
    city: SAMPLE_CITY,
    restaurants: List.of(THE_RESTAURANT),
    customers: List.of(TEST_CUSTOMER),
    addresses: List.of(TEST_ADDRESS),
    drivers: List.of(DRIVER),
};

const step = (atSeconds: number, actor: string, command: IRunInput['command']): IRunInput =>
    toTestAddress({
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
    const run = createRun({ functions: REGISTERED_FUNCTIONS, seed: toSeed(SEED) });
    const steps = ONE_ORDER.concat(extraSteps);
    return scheduleInputs(run, START, steps);
}

/** The one-order run, moved on to a time, by default its end. */
export function oneOrderRun(until = END_MS): IRunState {
    const started = startedOneOrder();
    return advance(started, until);
}

/**
 * The one-order run with a refused call, a config change, an implementation change, and a
 * script's step that changes rules, run to its end, so its commits hold every kind of record a
 * run makes today.
 */
export function variedRun(): IRunState {
    const refused = step(1, 'driver-1', 'accept');
    const lag = changesOf(ORDERS_INBOX_READ_LAG, ORDERS_READ_LAG, TUNED_READ_LAG_MS);
    const rulesStep: IRulesInput = { at: toSimTime(RULES_STEP_MS), changes: lag };
    const uses = List([{ function: FunctionName.OrdersPickUp, version: toVersionNumber(1) }]);
    const useStep: IUseInput = { at: toSimTime(RULES_STEP_MS), uses };
    const started = startedOneOrder([
        { ...refused, order: toInputOrderName('no-such-order') },
        rulesStep,
        useStep,
    ]);
    const early = advance(started, 2 * SECOND);
    const changes = changesOf(DISPATCH_PASS, DISPATCH_PASS_INTERVAL, TUNED_DISPATCH_PASS_MS);
    const at = toSimTime(2 * SECOND);
    const tuned = changeConfig(early, at, changes);
    const version = toVersionNumber(1);
    const markReady = List([{ function: FunctionName.OrdersMarkReady, version }]);
    const switched = switchVersions(tuned, at, markReady);
    return advance(switched, END_MS);
}

/** How long the riding run goes on, in seconds: long enough for a few of each app's sends. */
const RIDING_SECONDS = 100;

/**
 * The one driver of the one-order run with no order, and their app sending its location every 30
 * seconds, as a scenario's drivers' apps do (FND-90). Kept apart from the runs above, so their
 * functions' pinned results stay as they were.
 */
export function ridingRun(): IRunState {
    const run = createRun({ functions: REGISTERED_FUNCTIONS, seed: toSeed(SEED) });
    const rider = {
        driverId: DRIVER.id,
        sendEvery: DEFAULT_SEND_EVERY,
        speedKmh: DEFAULT_SPEED_KMH,
    };
    const riders = List.of(rider);
    const noSteps = List<ScriptInput>();
    const started = scheduleInputs(run, { ...START, riders }, noSteps);
    return advance(started, RIDING_SECONDS * SECOND);
}

/**
 * The one-order run with its driver riding along the city's streets, and the pick-up stated a
 * second after they accept, so it waits for them to arrive (FND-90).
 */
export function riddenOrderRun(): IRunState {
    const run = createRun({ functions: REGISTERED_FUNCTIONS, seed: toSeed(SEED) });
    const rider = {
        driverId: DRIVER.id,
        sendEvery: DEFAULT_SEND_EVERY,
        speedKmh: DEFAULT_SPEED_KMH,
    };
    const riders = List.of(rider);
    const early = toSimTime((StepSeconds.Accept + 1) * SECOND);
    const steps = ONE_ORDER.map((step) =>
        step.command === 'pick-up' ? { ...step, at: early } : step,
    );
    const started = scheduleInputs(run, { ...START, riders }, steps);
    return advance(started, END_MS);
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
 * second accept that follows from it, a rules step that follows from it too, and a restaurant
 * running late stated by hand at 50 seconds: indirect commits the service does not see, run to
 * its end (FND-89).
 */
export function indirectRun(): IRunState {
    const ignored: IIndirectInput = { at: toSimTime(IGNORED_AT_MS), indirect: DRIVER_IGNORES };
    const label = toIndirectLabel('ignored');
    const followed: IRunInput = { ...step(FOLLOWED_AT_S, 'driver-1', 'accept'), after: label };
    const lag = changesOf(ORDERS_INBOX_READ_LAG, ORDERS_READ_LAG, TUNED_READ_LAG_MS);
    const rules: IRulesInput = {
        at: toSimTime(FOLLOWED_AT_S * SECOND),
        changes: lag,
        after: label,
    };
    const started = startedOneOrder([ignored, followed, rules]);
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
