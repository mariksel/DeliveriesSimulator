import { Coordinates } from './coordinates';
import type { Metres } from './numbers';
import { toDegrees, toMetres } from './numbers';
import { EARTH_RADIUS_METRES, radians } from './sphere';

/** How many metres one degree of latitude spans. */
const METRES_PER_DEGREE = EARTH_RADIUS_METRES * radians(1);

/** A place on a flat plane laid over a city, in metres east and north of the plane's origin. */
export interface IPlanePoint {
    readonly eastMetres: Metres;
    readonly northMetres: Metres;
}

/** How many metres one degree of longitude spans at the origin's latitude. */
function metresPerDegreeEast(origin: Coordinates): number {
    const latitude = radians(origin.latitude);
    return METRES_PER_DEGREE * Math.cos(latitude);
}

/**
 * Where a place lies on the flat plane over a city whose south-west corner is the origin. Over a
 * city the sphere is close enough to flat (FND-90).
 */
export function toPlane(origin: Coordinates, place: Coordinates): IPlanePoint {
    const east = (place.longitude - origin.longitude) * metresPerDegreeEast(origin);
    const north = (place.latitude - origin.latitude) * METRES_PER_DEGREE;
    const eastMetres = toMetres(east);
    const northMetres = toMetres(north);
    return { eastMetres, northMetres };
}

/** The place at a point on the flat plane over a city whose south-west corner is the origin. */
export function fromPlane(origin: Coordinates, point: IPlanePoint): Coordinates {
    const longitude = origin.longitude + point.eastMetres / metresPerDegreeEast(origin);
    const latitude = origin.latitude + point.northMetres / METRES_PER_DEGREE;
    const longitudeDegrees = toDegrees(longitude);
    const latitudeDegrees = toDegrees(latitude);
    return Coordinates.create({ latitude: latitudeDegrees, longitude: longitudeDegrees });
}
