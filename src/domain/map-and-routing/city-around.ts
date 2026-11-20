import { List, OrderedMap } from 'immutable';

import type { AreaId } from './area-id';
import { City, DEFAULT_BLOCK_METRES } from './city';
import { Coordinates } from './coordinates';
import { fromPlane, toPlane } from './local-plane';
import type { CitySeed } from './numbers';
import { toDegrees, toKilometres, toMetres } from './numbers';
import { toCount } from '../system/math/math';

/** How far a city made around places reaches beyond them, on every side (FND-90). */
export const MARGIN_AROUND_METRES = 500;
const METRES_PER_KILOMETRE = 1000;
const ONE = toCount(1);

/** Where a city with no places to go around starts: nowhere in particular. */
const NOWHERE = Coordinates.create({ latitude: toDegrees(0), longitude: toDegrees(0) });

/** The south-west-most corner of the places: their least latitude and least longitude. */
function cornerOf(places: List<Coordinates>): Coordinates {
    if (places.isEmpty()) {
        return NOWHERE;
    }
    const latitudes = places.map((place) => place.latitude);
    const longitudes = places.map((place) => place.longitude);
    const latitude = Math.min(...latitudes);
    const longitude = Math.min(...longitudes);
    return Coordinates.create({ latitude: toDegrees(latitude), longitude: toDegrees(longitude) });
}

/**
 * The smallest one-area city around some places, reaching 500 metres beyond them on every side,
 * with its one area named as given. An older stored scenario or saved run, which has no city,
 * gets one this way (FND-90).
 */
export function cityAround(places: List<Coordinates>, areaId: AreaId, seed: CitySeed): City {
    const corner = cornerOf(places);
    const extents = places.map((place) => {
        const point = toPlane(corner, place);
        return Math.max(point.eastMetres, point.northMetres);
    });
    const extentMetres = Math.max(0, ...extents);
    const sideMetres = extentMetres + 2 * MARGIN_AROUND_METRES;
    const outward = toMetres(-MARGIN_AROUND_METRES);
    const origin = fromPlane(corner, { eastMetres: outward, northMetres: outward });
    const sideKm = toKilometres(sideMetres / METRES_PER_KILOMETRE);
    return City.create({
        origin,
        widthKm: sideKm,
        heightKm: sideKm,
        across: ONE,
        down: ONE,
        seed,
        blockMetres: DEFAULT_BLOCK_METRES,
        areaIds: List.of(areaId),
        waitingPoints: OrderedMap(),
    });
}
