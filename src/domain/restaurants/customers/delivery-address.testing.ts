import type { AreaId } from '../../map-and-routing/area-id';
import { toAreaId } from '../../map-and-routing/area-id';
import { Coordinates } from '../../map-and-routing/coordinates';
import { toDegrees, toMetres } from '../../map-and-routing/numbers';
import type { AddressId } from './delivery-address';
import { DeliveryAddress, toAddressId } from './delivery-address';
import type { CustomerId } from './customer';
import { toCustomerId } from './customer';

/** About 280 metres south and 270 metres east of the usual restaurant. */
const LATITUDE = 10.3275;
const LONGITUDE = 20.8225;
const STORED_METRES = 620;

/**
 * A stored delivery address for a test: by default address-1, of customer-1, in area-1, south-east
 * of the usual restaurant.
 */
export function deliveryAddressOf(
    id: AddressId = toAddressId('address-1'),
    customerId: CustomerId = toCustomerId('customer-1'),
    areaId: AreaId = toAreaId('area-1'),
): DeliveryAddress {
    const coordinates = Coordinates.create({
        latitude: toDegrees(LATITUDE),
        longitude: toDegrees(LONGITUDE),
    });
    const storedMetres = toMetres(STORED_METRES);
    return DeliveryAddress.create({ id, customerId, areaId, coordinates, storedMetres });
}
