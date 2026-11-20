import { List, Set as ImmutableSet } from 'immutable';

import { toAreaId } from '../../domain/map-and-routing/area-id';
import { cityAround } from '../../domain/map-and-routing/city-around';
import { toCitySeed } from '../../domain/map-and-routing/numbers';
import type { IPersistedCity } from './persisted-city';
import { toPersistedCity } from './persisted-city';
import type { IPersistedCoordinates } from './persisted-coordinates';
import { fromPersistedCoordinates } from './persisted-coordinates';

/** The area a city with no places to go around names its one area. */
const FIRST_AREA = 'area-1';

/** A place as an older stored record gives it: its area's name, and its point, if it has one. */
export interface IRecordedPlace {
    readonly areaId: string;
    readonly coordinates: IPersistedCoordinates | null;
}

/**
 * The city an older stored scenario or saved run gets, which has none: one square area around its
 * places, named as the one area they use. One that used several areas is refused, saying why,
 * since no grid could keep every place in its own area (FND-90).
 */
export function persistedCityAround(
    places: readonly IRecordedPlace[],
    what: string,
    seed = 0,
): IPersistedCity {
    const areaNames = places.map((place) => place.areaId);
    const names = ImmutableSet(areaNames);
    if (names.size > 1) {
        const listed = names.toArray().join(', ');
        throw new Error(
            `${what} uses several areas (${listed}), and no grid can keep every place in its own. Give it a city by hand.`,
        );
    }
    const name = names.first() ?? FIRST_AREA;
    const points = places.flatMap((place) =>
        place.coordinates === null ? [] : [fromPersistedCoordinates(place.coordinates)],
    );
    const areaId = toAreaId(name);
    const placed = List(points);
    const citySeed = toCitySeed(seed);
    const city = cityAround(placed, areaId, citySeed);
    return toPersistedCity(city);
}
