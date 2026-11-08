import type { FieldsOf } from '../system/classes/fields-of';
import type { AreaId } from '../map-and-routing/area-id';
import type { Coordinates } from '../map-and-routing/coordinates';

/** A restaurant. */
export type RestaurantId = string & { readonly brand: 'RestaurantId' };
/** Marks text as a restaurant's ID. */
export const toRestaurantId = (value: string): RestaurantId => value as RestaurantId;

/** Where a restaurant is, as dispatch needs it. */
export class RestaurantPlace {
    /** A restaurant's place: the restaurant, the area it is in, and where it is. */
    static create(fields: FieldsOf<RestaurantPlace>): RestaurantPlace {
        return new RestaurantPlace(fields.id, fields.areaId, fields.coordinates);
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: RestaurantId,
        readonly areaId: AreaId,
        readonly coordinates: Coordinates,
    ) {
        Object.freeze(this);
    }
}
