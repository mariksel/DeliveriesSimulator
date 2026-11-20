import { List, Map as ImmutableMap } from 'immutable';

import type { City } from './city';
import type { Coordinates } from './coordinates';
import type { IPlanePoint } from './local-plane';
import { toPlane } from './local-plane';
import type { Metres } from './numbers';
import { toMetres } from './numbers';
import type { ICrossing, IStreet, StreetGrid } from './street-grid';
import { crossingKey } from './street-grid';
import { required } from '../system/validation/required';

/**
 * A route along a city's streets: the points it passes, from where it starts to where it ends, in
 * metres east and north of the city's south-west corner, and how long it is (FND-90).
 */
export interface IRoute {
    readonly points: List<IPlanePoint>;
    readonly metres: Metres;
}

/** Where a place joins the streets: the nearest point on a street, and that street. */
interface IJoin {
    readonly point: IPlanePoint;
    readonly street: IStreet;
}

/** A way off a street at one of its ends: that crossing, and how far along the street it is. */
interface IExit {
    readonly crossing: ICrossing;
    readonly metres: number;
}

const distance = (from: IPlanePoint, to: IPlanePoint): number =>
    Math.hypot(to.eastMetres - from.eastMetres, to.northMetres - from.northMetres);

function clamp(value: number, low: number, high: number): number {
    const atLeast = Math.max(value, low);
    return Math.min(atLeast, high);
}

/** The point on a street nearest a place. */
function nearestOn(grid: StreetGrid, street: IStreet, place: IPlanePoint): IPlanePoint {
    const from = grid.pointOf(street.from);
    const to = grid.pointOf(street.to);
    const east = clamp(place.eastMetres, from.eastMetres, to.eastMetres);
    const north = clamp(place.northMetres, from.northMetres, to.northMetres);
    return { eastMetres: toMetres(east), northMetres: toMetres(north) };
}

/** Where a place joins the streets: the nearest point on any street, the first on a tie. */
function joinOf(grid: StreetGrid, place: IPlanePoint): IJoin {
    const nearest = grid.streets.reduce<IJoin | null>((best, street) => {
        const point = nearestOn(grid, street, place);
        if (best === null) {
            return { point, street };
        }
        const isNearer = distance(place, point) < distance(place, best.point);
        return isNearer ? { point, street } : best;
    }, null);
    // A city always has its main roads.
    return required(nearest, 'a street to join');
}

/** The two ways off a street from a point on it: to each of its ends. */
function exitsOf(grid: StreetGrid, join: IJoin): readonly IExit[] {
    const fromEnd = grid.pointOf(join.street.from);
    const toEnd = grid.pointOf(join.street.to);
    return [
        { crossing: join.street.from, metres: distance(join.point, fromEnd) },
        { crossing: join.street.to, metres: distance(join.point, toEnd) },
    ];
}

/** Each crossing's neighbours along the grid's streets, in the order the streets come. */
function neighboursOf(grid: StreetGrid): ImmutableMap<string, List<ICrossing>> {
    const none = List<ICrossing>();
    const empty = ImmutableMap<string, List<ICrossing>>();
    return grid.streets.reduce((neighbours, street) => {
        const from = crossingKey(street.from);
        const to = crossingKey(street.to);
        return neighbours
            .update(from, none, (crossings) => crossings.push(street.to))
            .update(to, none, (crossings) => crossings.push(street.from));
    }, empty);
}

/**
 * The crossing each crossing was first reached from, walking out from a start a layer at a time:
 * as every street is a block long, the first way found to a crossing is a shortest one.
 */
function cameFrom(
    frontier: List<ICrossing>,
    parents: ImmutableMap<string, ICrossing | null>,
    neighbours: ImmutableMap<string, List<ICrossing>>,
): ImmutableMap<string, ICrossing | null> {
    if (frontier.isEmpty()) {
        return parents;
    }
    const step = frontier.reduce(
        (soFar, crossing) => {
            const here = crossingKey(crossing);
            const around = neighbours.get(here) ?? List<ICrossing>();
            return around.reduce((inner, next) => {
                const key = crossingKey(next);
                return inner.parents.has(key)
                    ? inner
                    : { parents: inner.parents.set(key, crossing), next: inner.next.push(next) };
            }, soFar);
        },
        { parents, next: List<ICrossing>() },
    );
    return cameFrom(step.next, step.parents, neighbours);
}

/** The crossings from a start to an end, by the crossing each was reached from. */
function pathTo(
    parents: ImmutableMap<string, ICrossing | null>,
    end: ICrossing,
): List<ICrossing> | undefined {
    const key = crossingKey(end);
    if (!parents.has(key)) {
        return undefined;
    }
    const before = parents.get(key) ?? null;
    if (before === null) {
        return List.of(end);
    }
    const earlier = pathTo(parents, before);
    return earlier?.push(end);
}

/** A candidate way from one join to another: out of one street, across, and into the other. */
interface IWay {
    readonly metres: number;
    readonly crossings: List<ICrossing>;
}

/** The ways out of the first street, across the grid, and into the second. */
function waysBetween(
    grid: StreetGrid,
    start: IJoin,
    end: IJoin,
    neighbours: ImmutableMap<string, List<ICrossing>>,
): readonly IWay[] {
    const ends = exitsOf(grid, end);
    return exitsOf(grid, start).flatMap((exit) => {
        const key = crossingKey(exit.crossing);
        const origin = ImmutableMap<string, ICrossing | null>().set(key, null);
        const frontier = List.of(exit.crossing);
        const parents = cameFrom(frontier, origin, neighbours);
        return ends.flatMap((entry) => {
            const crossings = pathTo(parents, entry.crossing);
            if (crossings === undefined) {
                return [];
            }
            const along = (crossings.size - 1) * grid.spacingMetres;
            return [{ metres: exit.metres + along + entry.metres, crossings }];
        });
    });
}

/**
 * The shortest route between two places along a city's streets: a straight leg from the start to
 * the nearest point on a street, the streets themselves, and a straight leg from the nearest point
 * on a street to the end. The legs count in its length (FND-90).
 */
export function routeBetween(grid: StreetGrid, from: IPlanePoint, to: IPlanePoint): IRoute {
    const start = joinOf(grid, from);
    const end = joinOf(grid, to);
    const legs = distance(from, start.point) + distance(end.point, to);
    const isSameStreet = start.street === end.street;
    const direct: readonly IWay[] = isSameStreet
        ? [{ metres: distance(start.point, end.point), crossings: List<ICrossing>() }]
        : [];
    const neighbours = neighboursOf(grid);
    const ways = [...direct, ...waysBetween(grid, start, end, neighbours)];
    const best = ways.reduce((shortest, way) => (way.metres < shortest.metres ? way : shortest));
    const corners = best.crossings.map((crossing) => grid.pointOf(crossing));
    const points = List.of(from, start.point).concat(corners, [end.point, to]);
    return { points, metres: toMetres(legs + best.metres) };
}

/** The shortest route between two points on the map, along a city's streets (FND-90). */
export function routeOnMap(
    city: City,
    grid: StreetGrid,
    from: Coordinates,
    to: Coordinates,
): IRoute {
    const start = toPlane(city.origin, from);
    const end = toPlane(city.origin, to);
    return routeBetween(grid, start, end);
}
