import { List } from 'immutable';

import { Customer, toCustomerId } from '../../domain/restaurants/customers/customer';
import { toAddressId } from '../../domain/restaurants/customers/delivery-address';
import { deliveryAddressOf } from '../../domain/restaurants/customers/delivery-address.testing';
import { toRestaurantId } from '../../domain/restaurants/restaurant-place';
import type { IRunInput, IRunStart } from './run-input';

/** The usual restaurant's one customer, for a test run (FND-90). */
export const TEST_CUSTOMER = Customer.create({
    id: toCustomerId('customer-1'),
    restaurantId: toRestaurantId('restaurant-1'),
});

/** The test customer's one stored address. */
export const TEST_ADDRESS = deliveryAddressOf();

/** Where a test run's orders go: the test customer, at their one address. */
export const TO_TEST_ADDRESS = {
    customer: toCustomerId('customer-1'),
    address: toAddressId('address-1'),
} as const;

/** A test run's start, with the usual restaurant's customer and their address. */
export const withTestCustomer = (start: IRunStart): IRunStart => ({
    ...start,
    customers: List.of(TEST_CUSTOMER),
    addresses: List.of(TEST_ADDRESS),
});

/** An input, sent to the test address when it creates an order and names no address itself. */
export const toTestAddress = (input: IRunInput): IRunInput =>
    input.command === 'create-order' && input.address === undefined
        ? { ...input, ...TO_TEST_ADDRESS }
        : input;
