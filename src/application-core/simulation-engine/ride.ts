import type { List } from 'immutable';

import type { AreaId } from '../../domain/map-and-routing/area-id';
import type { City } from '../../domain/map-and-routing/city';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import type { IPlanePoint } from '../../domain/map-and-routing/local-plane';
import { fromPlane, toPlane } from '../../domain/map-and-routing/local-plane';
import { toMetres } from '../../domain/map-and-routing/numbers';
import type { OrderId } from '../../domain/orders/order';
import { SimTime } from '../../domain/simulation-engine/sim-time';
import { required } from '../../domain/system/validation/required';
import type { InputActor, InputOrderName } from './input-names';
import type { OrderCommand } from './input-command';

/**
 * The kinds of decision a simulated driver makes as they ride, which the engine states as
 * indirect commits, as FND-81 places simulated actors' plans in the indirect part (FND-90).
 */
export const RideKind = {
    /** The driver sets off along the streets for their nearest stop that is due. */
    SetsOff: 'driver-sets-off',
    /** A scripted pick-up or delivery came before the driver arrived: they will act on arrival. */
    ActsOnArrival: 'driver-acts-on-arrival',
    /** The driver has no stop due, so sets off for their area's waiting point. */
    GoesToWait: 'driver-goes-to-wait',
} as const;

/** One of the values of {@link RideKind}. */
export type RideKind = (typeof RideKind)[keyof typeof RideKind];

/** A driver setting off for a stop: the route they ride, from where they are, and how fast. */
export interface IDriverSetsOff {
    readonly kind: typeof RideKind.SetsOff;
    readonly actor: InputActor;
    /** The order whose stop it is. */
    readonly stopOrder: OrderId;
    /** Whether the stop is the order's restaurant, to pick it up, rather than its address. */
    readonly isPickUp: boolean;
    /** The points of the route along the streets, from where they set off to the stop. */
    readonly path: List<Coordinates>;
    readonly metres: number;
    readonly speedKmh: number;
    readonly label: null;
}

/** A driver with no stop due setting off for their area's waiting point, to wait there. */
export interface IDriverGoesToWait {
    readonly kind: typeof RideKind.GoesToWait;
    readonly actor: InputActor;
    /** The area whose waiting point it is: the driver's service area as they set off. */
    readonly areaId: AreaId;
    /** The points of the route along the streets, from where they set off to the point. */
    readonly path: List<Coordinates>;
    readonly metres: number;
    readonly speedKmh: number;
    readonly label: null;
}

/** A ride along the streets: to a stop that is due, or to wait (FND-90). */
export type RideLeg = IDriverSetsOff | IDriverGoesToWait;

/** A scripted pick-up or delivery that waits for its driver to arrive, then runs (FND-90). */
export interface IDriverActsOnArrival {
    readonly kind: typeof RideKind.ActsOnArrival;
    readonly actor: InputActor;
    readonly command: OrderCommand;
    readonly order: InputOrderName;
    readonly label: null;
}

/** A driver's latest ride: when they set off, and where to. */
export interface IRide {
    readonly at: SimTime;
    readonly leg: RideLeg;
}

/** A decision a simulated driver makes as they ride. */
export type RideStatement = RideLeg | IDriverActsOnArrival;

const RIDE_KINDS: readonly string[] = [
    RideKind.SetsOff,
    RideKind.ActsOnArrival,
    RideKind.GoesToWait,
];

/** Whether a statement is one a riding driver makes, rather than one stated by hand. */
export const isRideStatement = (statement: { readonly kind: string }): boolean =>
    RIDE_KINDS.includes(statement.kind);

const MS_PER_HOUR = 3_600_000;
const METRES_PER_KILOMETRE = 1000;

/** How many milliseconds a driver takes to ride a distance at a speed. */
const rideMs = (metres: number, speedKmh: number): number =>
    (metres * MS_PER_HOUR) / (speedKmh * METRES_PER_KILOMETRE);

/** When a driver who set off arrives at their stop, to the next whole millisecond. */
export function arrivalAt(at: SimTime, leg: RideLeg): SimTime {
    const ms = rideMs(leg.metres, leg.speedKmh);
    const arrival = Math.ceil(at.milliseconds + ms);
    return SimTime.ofMilliseconds(arrival);
}

const lengthOf = (from: IPlanePoint, to: IPlanePoint): number =>
    Math.hypot(to.eastMetres - from.eastMetres, to.northMetres - from.northMetres);

/** How far along a path a walk has got, and where it stopped, once it has. */
interface IWalk {
    readonly left: number;
    readonly point: IPlanePoint | null;
}

/** The point a distance along a path, or its end when the path is shorter. */
function alongPath(points: readonly IPlanePoint[], metres: number): IPlanePoint {
    const [first] = points;
    // A route always has its start.
    const start = required(first, 'the start of a route');
    const walked = points.slice(1).reduce<IWalk & { readonly from: IPlanePoint }>(
        (walk, to) => {
            if (walk.point !== null) {
                return walk;
            }
            const length = lengthOf(walk.from, to);
            if (walk.left > length || length === 0) {
                return { left: walk.left - length, point: null, from: to };
            }
            const share = walk.left / length;
            const east = walk.from.eastMetres + (to.eastMetres - walk.from.eastMetres) * share;
            const north = walk.from.northMetres + (to.northMetres - walk.from.northMetres) * share;
            const point = { eastMetres: toMetres(east), northMetres: toMetres(north) };
            return { left: 0, point, from: to };
        },
        { left: metres, point: null, from: start },
    );
    return walked.point ?? walked.from;
}

/**
 * The part of a ride still to go at a time: from where the driver is, through the route's
 * remaining corners, to the stop; none once they have arrived (FND-90).
 */
export function routeAhead(
    city: City,
    setOffAt: SimTime,
    leg: RideLeg,
    at: SimTime,
): List<Coordinates> {
    const elapsed = Math.max(0, at.milliseconds - setOffAt.milliseconds);
    const travelled = (elapsed * leg.speedKmh * METRES_PER_KILOMETRE) / MS_PER_HOUR;
    if (travelled >= leg.metres) {
        return leg.path.clear();
    }
    const points = leg.path.map((point) => toPlane(city.origin, point)).toArray();
    const lengths = points.map((point, index) =>
        index === 0 ? 0 : lengthOf(points[index - 1] ?? point, point),
    );
    const reached = lengths.map((_length, index) =>
        lengths.slice(0, index + 1).reduce((sum, length) => sum + length, 0),
    );
    const here = positionOnRide(city, setOffAt, leg, at);
    const rest = leg.path.filter((_point, index) => (reached[index] ?? 0) > travelled);
    return rest.unshift(here);
}

/**
 * Where a driver who set off is at a time: along their route at their speed, or at their stop
 * once they have arrived (FND-90).
 */
export function positionOnRide(
    city: City,
    setOffAt: SimTime,
    leg: RideLeg,
    at: SimTime,
): Coordinates {
    const elapsed = Math.max(0, at.milliseconds - setOffAt.milliseconds);
    const travelled = (elapsed * leg.speedKmh * METRES_PER_KILOMETRE) / MS_PER_HOUR;
    const points = leg.path.map((point) => toPlane(city.origin, point)).toArray();
    const point = alongPath(points, travelled);
    return fromPlane(city.origin, point);
}
