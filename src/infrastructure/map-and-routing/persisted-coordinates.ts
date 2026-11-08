import { Coordinates } from '../../domain/map-and-routing/coordinates';
import { toDegrees } from '../../domain/map-and-routing/numbers';

/** A point on the map, persisted. */
export interface IPersistedCoordinates {
    readonly latitude: number;
    readonly longitude: number;
}

/** A point on the map, persisted. */
export const toPersistedCoordinates = (coordinates: Coordinates): IPersistedCoordinates => ({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
});

/** A point on the map, from its persisted form. */
export function fromPersistedCoordinates(coordinates: IPersistedCoordinates): Coordinates {
    const latitude = toDegrees(coordinates.latitude);
    const longitude = toDegrees(coordinates.longitude);
    return Coordinates.create({ latitude, longitude });
}
