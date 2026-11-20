import type { Map as ImmutableMap } from 'immutable';
import { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import { ScriptedCommand } from '../../application-core/scenarios/scripted-command';
import type { CustomerId } from '../../domain/restaurants/customers/customer';
import { toCustomerId } from '../../domain/restaurants/customers/customer';
import type { AddressId } from '../../domain/restaurants/customers/delivery-address';
import { toAddressId } from '../../domain/restaurants/customers/delivery-address';
import type { IKnownCustomer } from './read-customers';
import type { Fields } from './scenario-reader';
import { readText } from './scenario-reader';

const NONE = List<IScenarioProblem>();

/** Where a created order goes: its customer and one of their addresses; nothing for others. */
export interface IOrderDestination {
    readonly customer?: CustomerId;
    readonly address?: AddressId;
}

/** A destination read from a step, and what is wrong with it. */
export interface IDestinationReading {
    readonly value: IOrderDestination;
    readonly problems: List<IScenarioProblem>;
}

/** What a step names and the customers it may name from. */
interface INamed {
    readonly actor: string | null;
    readonly customers: ImmutableMap<string, IKnownCustomer>;
}

/** Problems for a customer or address given on a step that does not create an order. */
function notCreating(step: Fields, path: string): List<IScenarioProblem> {
    const customer =
        step['customer'] === undefined
            ? NONE
            : problemAt(`${path}customer`, 'is only for a CreateOrder step');
    const address =
        step['address'] === undefined
            ? NONE
            : problemAt(`${path}address`, 'is only for a CreateOrder step');
    return customer.concat(address);
}

/** What is wrong with a named customer: unknown, or a customer of another restaurant. */
function customerProblems(
    path: string,
    known: IKnownCustomer | undefined,
    actor: string | null,
): List<IScenarioProblem> {
    if (known === undefined) {
        return problemAt(`${path}customer`, "is not one of the scenario's customers");
    }
    return actor === null || known.restaurant === actor
        ? NONE
        : problemAt(
              `${path}customer`,
              `is a customer of "${known.restaurant}", not of "${actor}"`,
          );
}

/** What is wrong with a named address: not one of the customer's. */
function addressProblems(
    path: string,
    address: string | null,
    customer: string,
    known: IKnownCustomer | undefined,
): List<IScenarioProblem> {
    if (address === null || known === undefined || known.addresses.has(address)) {
        return NONE;
    }
    return problemAt(`${path}address`, `is not one of "${customer}"'s addresses`);
}

/** What is wrong with whose the named customer and address are. */
function ownershipProblems(
    path: string,
    customer: string,
    address: string | null,
    named: INamed,
): List<IScenarioProblem> {
    const known = named.customers.get(customer);
    const ofCustomer = customerProblems(path, known, named.actor);
    const ofAddress = addressProblems(path, address, customer, known);
    return ofCustomer.concat(ofAddress);
}

/** The destination once both its fields are read. */
function destinationOf(customer: string | null, address: string | null): IOrderDestination {
    if (customer === null || address === null) {
        return {};
    }
    const customerId = toCustomerId(customer);
    const addressId = toAddressId(address);
    return { customer: customerId, address: addressId };
}

/**
 * Reads where a step's order goes. A CreateOrder step names its customer, who must be the acting
 * restaurant's, and one of that customer's addresses (FND-90); no other step names either.
 */
export function readDestination(
    step: Fields,
    path: string,
    command: ScriptedCommand | undefined,
    named: INamed,
): IDestinationReading {
    if (command !== ScriptedCommand.CreateOrder) {
        const problems = notCreating(step, path);
        return { value: {}, problems };
    }
    const customer = readText(step, path, 'customer');
    const address = readText(step, path, 'address');
    const ownership =
        customer.value === null
            ? NONE
            : ownershipProblems(path, customer.value, address.value, named);
    return {
        value: destinationOf(customer.value, address.value),
        problems: customer.problems.concat(address.problems, ownership),
    };
}
