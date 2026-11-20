import { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import type { AreaId } from '../../domain/map-and-routing/area-id';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import type { City } from '../../domain/map-and-routing/city';
import type { Coordinates } from '../../domain/map-and-routing/coordinates';
import { SeededRandom } from '../../domain/simulation-engine/seeded-random';
import { toSeed } from '../../domain/simulation-engine/numbers';
import type { Fields, IReading } from './scenario-reader';
import { readCoordinates, readText } from './scenario-reader';

const NONE = List<IScenarioProblem>();

/** A field that may be left out: nothing, with no problems, when it is. */
export function readOptional<T>(
    fields: Fields,
    key: string,
    read: () => IReading<T>,
): IReading<T> {
    return fields[key] === undefined ? { value: null, problems: NONE } : read();
}

/** Reads a place's area, if it gives one. */
export const readArea = (fields: Fields, path: string): IReading<string> =>
    readOptional(fields, 'area', () => readText(fields, path, 'area'));

/** Reads a restaurant's location, if it gives one. */
export const readPlace = (fields: Fields, path: string): IReading<Coordinates> =>
    readOptional(fields, 'location', () => readCoordinates(fields, path));

/** The area a point lies in, which must be in the city and agree with any area given. */
function areaOfPoint(
    city: City,
    path: string,
    area: string | null,
    point: Coordinates,
): IReading<AreaId> {
    const found = city.areaAt(point);
    if (found === undefined) {
        return { value: null, problems: problemAt(`${path}location`, 'lies outside the city') };
    }
    if (area !== null && area !== found) {
        const message = `is "${area}", but the location lies in "${found}"`;
        return { value: null, problems: problemAt(`${path}area`, message) };
    }
    return { value: found, problems: NONE };
}

/**
 * A restaurant's or driver's area, from its point, its area, or both when they agree: the area
 * always follows from the point (FND-90). Nothing, with no problems of its own, when the city
 * could not be read, since the city's problems say why.
 */
export function placeIn(
    city: City | null,
    path: string,
    area: string | null,
    point: Coordinates | null,
): IReading<AreaId> {
    if (city === null) {
        return { value: null, problems: NONE };
    }
    if (point !== null) {
        return areaOfPoint(city, path, area, point);
    }
    if (area === null) {
        return {
            value: null,
            problems: problemAt(`${path}area`, 'is missing: give an area, a location, or both'),
        };
    }
    const areaId = toAreaId(area);
    return city.areaIds.includes(areaId)
        ? { value: areaId, problems: NONE }
        : { value: null, problems: problemAt(`${path}area`, "is not one of the city's areas") };
}

/**
 * Where a restaurant is: the point it gives, or one the city's seed picks in its area, from a
 * stream named after the restaurant, so adding a restaurant moves no other (FND-90).
 */
export function restaurantPoint(
    city: City,
    areaId: AreaId,
    point: Coordinates | null,
    id: string,
): Coordinates | null {
    if (point !== null) {
        return point;
    }
    const seed = toSeed(city.seed);
    const random = SeededRandom.createNew(seed);
    const picked = city.pickIn(areaId, random, id);
    return picked === undefined ? null : picked[0];
}
