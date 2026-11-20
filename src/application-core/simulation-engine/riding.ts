import { List, Map as ImmutableMap } from 'immutable';

import { DeliveryState } from '../../domain/drivers/deliveries/order-delivery';
import type { DriverId } from '../../domain/drivers/driver';
import { toDriverId } from '../../domain/drivers/driver';
import { LogSource, TechnicalLogKind } from '../../domain/event-log/log-vocabulary';
import type { City } from '../../domain/map-and-routing/city';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import { fromPlane } from '../../domain/map-and-routing/local-plane';
import type { IRoute } from '../../domain/map-and-routing/route';
import { routeOnMap } from '../../domain/map-and-routing/route';
import { StreetGrid } from '../../domain/map-and-routing/street-grid';
import type { OrderId } from '../../domain/orders/order';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { IndirectEffect } from './indirect-effect';
import { InputCommand } from './input-command';
import { toInputActor } from './input-names';
import type { IMainRoot } from './main-root';
import type { IDriverActsOnArrival, IRide, RideLeg } from './ride';
import { arrivalAt, positionOnRide, RideKind } from './ride';
import type { IRider } from './rider';
import type { IRunInput } from './run-input';
import { NO_CAUSE, writeEntry } from './run-log';
import type { RunLogRecord } from './run-log-entry';
import type { IRunState } from './run-state';
import { commitIndirect, withLog } from './run-state';

/** Each driver's latest ride among a root's indirect effects, by the driver's name (FND-90). */
export function latestRides(records: List<IndirectEffect>): ImmutableMap<string, IRide> {
    const none = ImmutableMap<string, IRide>();
    return records.reduce(
        (rides, effect) =>
            effect.kind === RideKind.SetsOff || effect.kind === RideKind.GoesToWait
                ? rides.set(effect.actor, { at: effect.at, leg: effect })
                : rides,
        none,
    );
}

/** A stop a driver is due at: the restaurant of an order to pick up, or the address to take it. */
interface IStop {
    readonly orderId: OrderId;
    readonly isPickUp: boolean;
    readonly point: Coordinates;
}

/** Each city's streets, worked out once: a city never changes during a run. */
const GRIDS = new WeakMap<City, StreetGrid>();

function gridOf(city: City): StreetGrid {
    const known = GRIDS.get(city);
    if (known !== undefined) {
        return known;
    }
    const seed = toSeed(city.seed);
    const source = SeededRandom.createNew(seed);
    const grid = StreetGrid.createNew(city, source);
    GRIDS.set(city, grid);
    return grid;
}

/**
 * Where a driver is at a time: along their latest ride, or where they last were seen, which for a
 * driver who has not set off is where the scenario put them (FND-90).
 */
export function riderPosition(
    run: IRunState,
    driverId: DriverId,
    at: SimTime,
): Coordinates | null {
    const { city } = run.script;
    const actor = toInputActor(driverId);
    const ride = run.cache.rides.get(actor);
    if (city !== null && ride !== undefined) {
        return positionOnRide(city, ride.at, ride.leg, at);
    }
    const location = run.root.state.drivers.locationOf(driverId);
    return location?.coordinates ?? null;
}

/** The stops a driver is due at: each order they accepted and not picked up, and each on board. */
function dueStops(root: IMainRoot, driverId: DriverId): readonly IStop[] {
    const { deliveries } = root.state;
    // Every delivery so far is looked at, so the cheap checks come first.
    return deliveries.deliveryVersions
        .valueSeq()
        .filter(
            (version) =>
                version.driverId === driverId &&
                (version.state === DeliveryState.Assigned ||
                    version.state === DeliveryState.PickedUp),
        )
        .toArray()
        .flatMap((version): IStop[] => {
            const delivery = deliveries.deliveryOf(version.orderId);
            if (delivery === undefined) {
                return [];
            }
            if (version.state === DeliveryState.Assigned) {
                const point = delivery.restaurant.coordinates;
                return [{ orderId: version.orderId, isPickUp: true, point }];
            }
            return version.state === DeliveryState.PickedUp
                ? [{ orderId: version.orderId, isPickUp: false, point: delivery.destination }]
                : [];
        });
}

/** The route to the nearest stop along the streets, the first on a tie. */
function nearestStop(
    city: City,
    from: Coordinates,
    stops: readonly IStop[],
): { readonly stop: IStop; readonly route: IRoute } | null {
    const grid = gridOf(city);
    const routes = stops.map((stop) => ({
        stop,
        route: routeOnMap(city, grid, from, stop.point),
    }));
    return routes.reduce<{ readonly stop: IStop; readonly route: IRoute } | null>(
        (best, next) => (best === null || next.route.metres < best.route.metres ? next : best),
        null,
    );
}

/** A ride along the streets from a place to a point, as its points and length. */
function streetsTo(
    city: City,
    from: Coordinates,
    to: Coordinates,
): { readonly path: List<Coordinates>; readonly metres: number } {
    const grid = gridOf(city);
    const route = routeOnMap(city, grid, from, to);
    const points = route.points.map((point) => fromPlane(city.origin, point));
    return { path: List(points), metres: route.metres };
}

/**
 * A driver with no stop due setting off for their area's waiting point, or none: when they are
 * there already, their area has none, or they rode in a run saved before waiting points (FND-90).
 */
function waitingRide(
    run: IRunState,
    driverId: DriverId,
    rider: IRider,
    from: Coordinates,
): RideLeg | null {
    const { city } = run.script;
    const areaId = run.root.state.drivers.versionOf(driverId)?.areaId;
    const point = areaId === undefined ? undefined : city?.waitingPointIn(areaId);
    if (rider.isStayingWhenIdle === true || city === null || areaId === undefined) {
        return null;
    }
    if (point === undefined) {
        return null;
    }
    const { path, metres } = streetsTo(city, from, point);
    if (metres === 0) {
        return null;
    }
    const actor = toInputActor(driverId);
    const { speedKmh } = rider;
    return { kind: RideKind.GoesToWait, actor, areaId, path, metres, speedKmh, label: null };
}

/**
 * Where a driver sets off for now: their nearest due stop along the streets, or, with none due,
 * their area's waiting point (FND-90).
 */
function plannedRide(run: IRunState, driverId: DriverId, at: SimTime): RideLeg | null {
    const { city } = run.script;
    const rider = run.script.riders.get(driverId);
    const from = riderPosition(run, driverId, at);
    if (city === null || rider === undefined || from === null) {
        return null;
    }
    const stops = dueStops(run.root, driverId);
    const nearest = nearestStop(city, from, stops);
    if (nearest === null) {
        return waitingRide(run, driverId, rider, from);
    }
    const points = nearest.route.points.map((point) => fromPlane(city.origin, point));
    return {
        kind: RideKind.SetsOff,
        actor: toInputActor(driverId),
        stopOrder: nearest.stop.orderId,
        isPickUp: nearest.stop.isPickUp,
        path: List(points),
        metres: nearest.route.metres,
        speedKmh: rider.speedKmh,
        label: null,
    };
}

/** An indirect commit the engine makes for a riding driver, with its log entry. */
function rideCommit(run: IRunState, effect: IndirectEffect): IRunState {
    const record: RunLogRecord = {
        source: LogSource.Actors,
        kind: TechnicalLogKind.IndirectEffectHappened,
        data: effect,
    };
    const log = writeEntry(run.cache.log, effect.at, record, undefined, NO_CAUSE);
    const logged = withLog(run, log);
    return commitIndirect(logged, effect);
}

/**
 * A driver, after one of their commands, setting off for their nearest due stop, or for their
 * area's waiting point when none is due: an indirect commit the engine makes, which the service
 * does not see (FND-90).
 */
export function setOff(run: IRunState, driverId: DriverId, at: SimTime): IRunState {
    const leg = plannedRide(run, driverId, at);
    return leg === null ? run : rideCommit(run, { ...leg, at, isScripted: false });
}

const WAITING_COMMANDS: readonly InputCommand[] = [InputCommand.PickUp, InputCommand.Deliver];

/**
 * Whether a scripted pick-up or delivery waits for its driver: the order's stop is due for them,
 * and they have not arrived there yet, or their earlier step on the order waits, unless the step
 * says it runs at its time. With no city, or no rider, a driver never rides, so a step never
 * waits (FND-90).
 */
export function waitsForArrival(run: IRunState, step: IRunInput): boolean {
    const orderId = run.cache.orderIds.get(step.order);
    if (
        !WAITING_COMMANDS.includes(step.command) ||
        step.isAtItsTime === true ||
        orderId === undefined
    ) {
        return false;
    }
    const driverId = toDriverId(step.actor);
    if (run.script.city === null || !run.script.riders.has(driverId)) {
        return false;
    }
    // A driver's step on an order waits behind their earlier one that waits, such as a delivery
    // behind its pick-up.
    const isBehind = run.cache.waitingOnArrival.some(
        (acts) => acts.actor === step.actor && acts.order === step.order,
    );
    if (isBehind) {
        return true;
    }
    const isPickUp = step.command === InputCommand.PickUp;
    const stops = dueStops(run.root, driverId);
    const isDue = stops.some((stop) => stop.orderId === orderId && stop.isPickUp === isPickUp);
    if (!isDue) {
        return false;
    }
    return !hasArrived(run, step, orderId, isPickUp);
}

/** Whether a driver's latest ride has got them to an order's stop by a step's time. */
function hasArrived(
    run: IRunState,
    step: IRunInput,
    orderId: OrderId,
    isPickUp: boolean,
): boolean {
    const ride = run.cache.rides.get(step.actor);
    return (
        ride !== undefined &&
        ride.leg.kind === RideKind.SetsOff &&
        ride.leg.stopOrder === orderId &&
        ride.leg.isPickUp === isPickUp &&
        !arrivalAt(ride.at, ride.leg).isAfter(step.at)
    );
}

/**
 * A scripted pick-up or delivery that came before its driver arrived: an indirect commit saying
 * they will act on arrival, which counts as the step, so the rest of the script runs on at its
 * times (FND-90).
 */
export function actOnArrival(run: IRunState, step: IRunInput): IRunState {
    const acts: IDriverActsOnArrival = {
        kind: RideKind.ActsOnArrival,
        actor: step.actor,
        command: step.command,
        order: step.order,
        label: null,
    };
    return rideCommit(run, { ...acts, at: step.at, isScripted: true });
}
