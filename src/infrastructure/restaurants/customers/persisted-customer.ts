import { toAreaId } from '../../../domain/map-and-routing/area-id';
import { toMetres } from '../../../domain/map-and-routing/numbers';
import { Customer, toCustomerId } from '../../../domain/restaurants/customers/customer';
import {
    DeliveryAddress,
    toAddressId,
} from '../../../domain/restaurants/customers/delivery-address';
import { toRestaurantId } from '../../../domain/restaurants/restaurant-place';
import type { IPersistedCoordinates } from '../../map-and-routing/persisted-coordinates';
import {
    fromPersistedCoordinates,
    toPersistedCoordinates,
} from '../../map-and-routing/persisted-coordinates';

/** A restaurant's customer, persisted (FND-90). */
export interface IPersistedCustomer {
    readonly id: string;
    readonly restaurantId: string;
}

/** A customer's stored delivery address, persisted. */
export interface IPersistedDeliveryAddress {
    readonly id: string;
    readonly customerId: string;
    readonly areaId: string;
    readonly coordinates: IPersistedCoordinates;
    readonly storedMetres: number;
}

/** A customer, persisted. */
export const toPersistedCustomer = (customer: Customer): IPersistedCustomer => ({
    id: customer.id,
    restaurantId: customer.restaurantId,
});

/** A customer, from their persisted form. */
export function fromPersistedCustomer(customer: IPersistedCustomer): Customer {
    const id = toCustomerId(customer.id);
    const restaurantId = toRestaurantId(customer.restaurantId);
    return Customer.create({ id, restaurantId });
}

/** A stored delivery address, persisted. */
export const toPersistedDeliveryAddress = (
    address: DeliveryAddress,
): IPersistedDeliveryAddress => ({
    id: address.id,
    customerId: address.customerId,
    areaId: address.areaId,
    coordinates: toPersistedCoordinates(address.coordinates),
    storedMetres: address.storedMetres,
});

/** A stored delivery address, from its persisted form. */
export function fromPersistedDeliveryAddress(address: IPersistedDeliveryAddress): DeliveryAddress {
    const coordinates = fromPersistedCoordinates(address.coordinates);
    return DeliveryAddress.create({
        id: toAddressId(address.id),
        customerId: toCustomerId(address.customerId),
        areaId: toAreaId(address.areaId),
        coordinates,
        storedMetres: toMetres(address.storedMetres),
    });
}
