import type { FieldsOf } from '../system/classes/fields-of';
import type { Degrees, Metres } from './numbers';
import { toMetres } from './numbers';

const EARTH_RADIUS_METRES = 6_371_000;
const DEGREES_PER_HALF_TURN = 180;
const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

const radians = (degrees: number): number => (degrees * Math.PI) / DEGREES_PER_HALF_TURN;

const isWithin = (degrees: number, limit: number): boolean =>
    Number.isFinite(degrees) && Math.abs(degrees) <= limit;

/** A place on the sphere, in degrees. */
export class Coordinates {
    /** A place, which must have a latitude from -90 to 90 and a longitude from -180 to 180. */
    static create({ latitude, longitude }: FieldsOf<Coordinates>): Coordinates {
        if (!isWithin(latitude, MAX_LATITUDE) || !isWithin(longitude, MAX_LONGITUDE)) {
            throw new RangeError(`Invalid coordinates: ${latitude}, ${longitude}.`);
        }
        return new Coordinates(latitude, longitude);
    }

    declare private readonly brand: never;

    private constructor(
        readonly latitude: Degrees,
        readonly longitude: Degrees,
    ) {
        Object.freeze(this);
    }

    /** The straight-line distance to another place over a sphere, in metres, not rounded. */
    straightLineMetresTo(to: Coordinates): Metres {
        const latitude = radians(to.latitude - this.latitude);
        const longitude = radians(to.longitude - this.longitude);
        const fromRadians = radians(this.latitude);
        const toRadians = radians(to.latitude);
        const haversine =
            Math.sin(latitude / 2) ** 2 +
            Math.cos(fromRadians) * Math.cos(toRadians) * Math.sin(longitude / 2) ** 2;
        const sqrt = Math.sqrt(haversine);
        const min = Math.min(1, sqrt);
        const metres = 2 * EARTH_RADIUS_METRES * Math.asin(min);
        return toMetres(metres);
    }
}
