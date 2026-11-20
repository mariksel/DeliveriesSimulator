import type { FieldsOf } from '../../system/classes/fields-of';
import type { AreaId } from '../../map-and-routing/area-id';
import type { Coordinates } from '../../map-and-routing/coordinates';
import type { Metres } from '../../map-and-routing/numbers';
import type { CustomerId } from './customer';

/** A customer's stored delivery address (FND-90). */
export type AddressId = string & { readonly brand: 'AddressId' };
/** Marks text as an address's ID. */
export const toAddressId = (value: string): AddressId => value as AddressId;

/**
 * A customer's stored delivery address: where it is, its area, and its stored distance, the route
 * along the streets from the customer's restaurant when it was stored, which routing falls back
 * on. It never changes once an order has used it (FND-38, FND-90).
 */
export class DeliveryAddress {
    /** An address, whose stored distance must not be below 0. */
    static create(fields: FieldsOf<DeliveryAddress>): DeliveryAddress {
        if (!(fields.storedMetres >= 0)) {
            throw new RangeError(
                `An address's stored distance must not be below 0, not ${fields.storedMetres}.`,
            );
        }
        return new DeliveryAddress(
            fields.id,
            fields.customerId,
            fields.areaId,
            fields.coordinates,
            fields.storedMetres,
        );
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: AddressId,
        readonly customerId: CustomerId,
        readonly areaId: AreaId,
        readonly coordinates: Coordinates,
        /** The route along the streets from the customer's restaurant, when it was stored. */
        readonly storedMetres: Metres,
    ) {
        Object.freeze(this);
    }
}
