import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { IPersistedCoordinates } from '../map-and-routing/persisted-coordinates';
import {
    fromPersistedCoordinates,
    toPersistedCoordinates,
} from '../map-and-routing/persisted-coordinates';

/** A restaurant's place, persisted. */
export interface IPersistedRestaurantPlace {
    readonly id: string;
    readonly areaId: string;
    readonly coordinates: IPersistedCoordinates;
}

/** A restaurant's place, persisted. */
export const toPersistedRestaurantPlace = (place: RestaurantPlace): IPersistedRestaurantPlace => ({
    id: place.id,
    areaId: place.areaId,
    coordinates: toPersistedCoordinates(place.coordinates),
});

/** A restaurant's place, from its persisted form. */
export function fromPersistedRestaurantPlace(place: IPersistedRestaurantPlace): RestaurantPlace {
    const coordinates = fromPersistedCoordinates(place.coordinates);
    const id = toRestaurantId(place.id);
    const areaId = toAreaId(place.areaId);
    return RestaurantPlace.create({ id, areaId, coordinates });
}
