import type { FieldsOf } from '../../system/classes/fields-of';
import type { RestaurantId } from '../restaurant-place';

/** A customer, of one restaurant (FND-90). */
export type CustomerId = string & { readonly brand: 'CustomerId' };
/** Marks text as a customer's ID. */
export const toCustomerId = (value: string): CustomerId => value as CustomerId;

/**
 * A customer, who receives deliveries. In `V1.0.0` a customer belongs to one restaurant, which
 * places orders for them (FND-38, FND-90).
 */
export class Customer {
    /** A customer of a restaurant. */
    static create(fields: FieldsOf<Customer>): Customer {
        return new Customer(fields.id, fields.restaurantId);
    }

    declare private readonly brand: never;

    private constructor(
        readonly id: CustomerId,
        readonly restaurantId: RestaurantId,
    ) {
        Object.freeze(this);
    }
}
