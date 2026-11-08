import type { AreaId } from '../map-and-routing/area-id';
import type { RestaurantId } from './restaurant-place';
import { toAreaId } from '../map-and-routing/area-id';
import { toRestaurantId } from './restaurant-place';
import { Coordinates } from '../map-and-routing/coordinates';
import { RestaurantPlace } from './restaurant-place';
import { toDegrees } from '../map-and-routing/numbers';

const LATITUDE = 10.33;
const LONGITUDE = 20.82;

/** A restaurant's place for a test: by default restaurant-1, in area-1, at the usual spot. */
export function restaurantPlaceOf(
    id: RestaurantId = toRestaurantId('restaurant-1'),
    areaId: AreaId = toAreaId('area-1'),
): RestaurantPlace {
    const coordinates = Coordinates.create({
        latitude: toDegrees(LATITUDE),
        longitude: toDegrees(LONGITUDE),
    });
    return RestaurantPlace.create({ id, areaId, coordinates });
}
