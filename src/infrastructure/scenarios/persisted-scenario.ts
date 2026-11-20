import type { IPersistedFunctionUse } from '../simulation-engine/persisted-function-use';
import {
    fromPersistedFunctionUse,
    toPersistedFunctionUse,
} from '../simulation-engine/persisted-function-use';
import { List } from 'immutable';
import type { IPersistedRider } from '../simulation-engine/persisted-run';
import { fromPersistedRider, toPersistedRider } from '../simulation-engine/persisted-run';

import type { IScenario } from '../../application-core/scenarios/scenario';
import { ScriptedCommand } from '../../application-core/scenarios/scripted-command';
import type { IScriptedStart, ScenarioStep } from '../../application-core/scenarios/scripted-step';
import {
    isIndirectStep,
    isRulesStep,
    isUseStep,
    toScenarioActor,
    toScenarioOrderName,
} from '../../application-core/scenarios/scripted-step';
import type { ScenarioContentKey } from '../../application-core/scenarios/scenario-version';
import { toScenarioContentKey } from '../../application-core/scenarios/scenario-version';
import { toIndirectLabel } from '../../application-core/simulation-engine/run-input';
import type { DriverAvailability } from '../../domain/drivers/driver-availability';
import { NewDriver, toDriverId } from '../../domain/drivers/driver';
import { toAreaId } from '../../domain/map-and-routing/area-id';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toVersionId } from '../../domain/versions/version-id';
import type { IPersistedParameterChange } from '../business-rules/persisted-parameter-change';
import {
    fromPersistedParameterChange,
    toPersistedParameterChange,
} from '../business-rules/persisted-parameter-change';
import type { IPersistedDriverLocation } from '../drivers/persisted-drivers-state';
import { fromPersistedLocation, toPersistedLocation } from '../drivers/persisted-drivers-state';
import type { IPersistedRestaurantPlace } from '../restaurants/persisted-restaurant-place';
import type {
    IPersistedCustomer,
    IPersistedDeliveryAddress,
} from '../restaurants/customers/persisted-customer';
import {
    fromPersistedCustomer,
    fromPersistedDeliveryAddress,
    toPersistedCustomer,
    toPersistedDeliveryAddress,
} from '../restaurants/customers/persisted-customer';
import { toCustomerId } from '../../domain/restaurants/customers/customer';
import { toAddressId } from '../../domain/restaurants/customers/delivery-address';
import type { IPersistedCity } from '../map-and-routing/persisted-city';
import { fromPersistedCity, toPersistedCity } from '../map-and-routing/persisted-city';
import {
    fromPersistedRestaurantPlace,
    toPersistedRestaurantPlace,
} from '../restaurants/persisted-restaurant-place';
import type { PersistedIndirectStatement } from '../simulation-engine/persisted-indirect-effect';
import {
    fromPersistedIndirectStatement,
    toPersistedIndirectStatement,
} from '../simulation-engine/persisted-indirect-effect';

/** A driver who exists when a scenario's run begins, persisted. */
export interface IPersistedNewDriver {
    readonly id: string;
    readonly areaId: string;
    readonly availability: DriverAvailability | null;
    readonly location: IPersistedDriverLocation | null;
}

/** The city, who exists when a scenario's run begins, and the rules it starts with, persisted. */
export interface IPersistedScriptedStart {
    /** Absent for a scenario stored before scenarios had cities. */
    readonly city?: IPersistedCity;
    readonly restaurants: readonly IPersistedRestaurantPlace[];
    /** Absent for a scenario stored before orders had customers (FND-90). */
    readonly customers?: readonly IPersistedCustomer[];
    readonly addresses?: readonly IPersistedDeliveryAddress[];
    readonly drivers: readonly IPersistedNewDriver[];
    /**
     * How the simulator rides each driver (FND-90). Absent for a scenario stored before drivers'
     * apps sent their locations, which the repository gives the defaults as it reads it.
     */
    readonly riders?: readonly IPersistedRider[];
    /** Null when the scenario sets none. */
    readonly rules: readonly IPersistedParameterChange[] | null;
}

/** An action by a restaurant or a driver, persisted. */
export interface IPersistedActionStep {
    readonly at: number;
    readonly actor: string;
    readonly command: ScriptedCommand;
    readonly order: string;
    readonly after: string | null;
    /** A create-order step's customer and address; absent on every other step (FND-90). */
    readonly customer?: string;
    readonly address?: string;
    /** True for a pick-up or delivery that runs at its time, not waiting for its driver. */
    readonly isAtItsTime?: true;
}

/** A step that changes rules, persisted. */
export interface IPersistedRulesStep {
    readonly at: number;
    readonly set: readonly IPersistedParameterChange[];
    readonly after: string | null;
}

/** A step that switches functions to other versions, persisted (FND-81). */
export interface IPersistedUseStep {
    readonly at: number;
    readonly use: readonly IPersistedFunctionUse[];
    readonly after: string | null;
}

/** A step that states an indirect effect, persisted. */
export interface IPersistedIndirectStep {
    readonly at: number;
    readonly indirect: PersistedIndirectStatement;
}

/** One step of a scenario, persisted. */
export type PersistedScenarioStep =
    IPersistedActionStep | IPersistedRulesStep | IPersistedUseStep | IPersistedIndirectStep;

/** A scenario's whole content, every field, persisted (FND-81). */
export interface IPersistedScenario {
    readonly name: string;
    readonly description: string | null;
    readonly version: string;
    readonly seed: number;
    readonly runUntil: number;
    readonly start: IPersistedScriptedStart;
    readonly steps: readonly PersistedScenarioStep[];
}

const toPersistedNewDriver = (driver: NewDriver): IPersistedNewDriver => ({
    id: driver.id,
    areaId: driver.areaId,
    availability: driver.availability,
    location: driver.location === null ? null : toPersistedLocation(driver.location),
});

const fromPersistedNewDriver = (driver: IPersistedNewDriver): NewDriver =>
    NewDriver.create({
        id: toDriverId(driver.id),
        areaId: toAreaId(driver.areaId),
        availability: driver.availability,
        location:
            driver.location === null ? null : fromPersistedLocation(driver.location, toSimTime),
    });

const toPersistedStart = (start: IScriptedStart): IPersistedScriptedStart => ({
    ...(start.city === null ? {} : { city: toPersistedCity(start.city) }),
    restaurants: start.restaurants.map(toPersistedRestaurantPlace).toArray(),
    customers: start.customers.map(toPersistedCustomer).toArray(),
    addresses: start.addresses.map(toPersistedDeliveryAddress).toArray(),
    drivers: start.drivers.map(toPersistedNewDriver).toArray(),
    riders: start.riders.map(toPersistedRider).toArray(),
    rules:
        start.rules === undefined ? null : start.rules.map(toPersistedParameterChange).toArray(),
});

function fromPersistedStart(start: IPersistedScriptedStart): IScriptedStart {
    const restaurants = start.restaurants.map(fromPersistedRestaurantPlace);
    const drivers = start.drivers.map(fromPersistedNewDriver);
    const city = start.city === undefined ? null : fromPersistedCity(start.city);
    const customers = (start.customers ?? []).map(fromPersistedCustomer);
    const addresses = (start.addresses ?? []).map(fromPersistedDeliveryAddress);
    const riders = (start.riders ?? []).map(fromPersistedRider);
    const base = {
        city,
        restaurants: List(restaurants),
        customers: List(customers),
        addresses: List(addresses),
        drivers: List(drivers),
        riders: List(riders),
    };
    if (start.rules === null) {
        return base;
    }
    const rules = start.rules.map(fromPersistedParameterChange);
    return { ...base, rules: List(rules) };
}

function toPersistedStep(step: ScenarioStep): PersistedScenarioStep {
    const at = step.at.milliseconds;
    if (isIndirectStep(step)) {
        const indirect = toPersistedIndirectStatement(step.indirect);
        return { at, indirect };
    }
    const after = step.after ?? null;
    if (isRulesStep(step)) {
        const set = step.set.map(toPersistedParameterChange).toArray();
        return { at, set, after };
    }
    if (isUseStep(step)) {
        const use = step.use.map(toPersistedFunctionUse).toArray();
        return { at, use, after };
    }
    const destination =
        step.customer === undefined || step.address === undefined
            ? {}
            : { customer: step.customer, address: step.address };
    const timing = step.isAtItsTime === true ? { isAtItsTime: true as const } : {};
    return {
        at,
        actor: step.actor,
        command: step.command,
        order: step.order,
        after,
        ...destination,
        ...timing,
    };
}

function fromPersistedStep(step: PersistedScenarioStep): ScenarioStep {
    const at = toSimTime(step.at);
    if ('indirect' in step) {
        const indirect = fromPersistedIndirectStatement(step.indirect);
        return { at, indirect };
    }
    const after = step.after === null ? {} : { after: toIndirectLabel(step.after) };
    if ('set' in step) {
        const changes = step.set.map(fromPersistedParameterChange);
        return { at, set: List(changes), ...after };
    }
    if ('use' in step) {
        const uses = step.use.map(fromPersistedFunctionUse);
        return { at, use: List(uses), ...after };
    }
    const actor = toScenarioActor(step.actor);
    const order = toScenarioOrderName(step.order);
    const destination =
        step.customer === undefined || step.address === undefined
            ? {}
            : { customer: toCustomerId(step.customer), address: toAddressId(step.address) };
    const timing = step.isAtItsTime === true ? { isAtItsTime: true } : {};
    return { at, actor, command: step.command, order, ...after, ...destination, ...timing };
}

/**
 * Refuses a scenario stored before orders had customers: a create-order step of it names no
 * customer or address, and nothing is made up for it, so it needs loading again (FND-90).
 */
function refuseWithoutCustomers(scenario: IPersistedScenario): void {
    const isOlder = scenario.steps.some(
        (step) =>
            'command' in step &&
            step.command === ScriptedCommand.CreateOrder &&
            (step.customer === undefined || step.address === undefined),
    );
    if (isOlder) {
        throw new Error(
            `The stored scenario "${scenario.name}" was stored before orders had customers: its create-order steps name no customer or address. Load it again from a file that gives them.`,
        );
    }
}

/** A scenario's whole content as persisted, every field, in a fixed order. */
export const toPersistedScenario = (scenario: IScenario): IPersistedScenario => ({
    name: scenario.name,
    description: scenario.description,
    version: scenario.version,
    seed: scenario.seed,
    runUntil: scenario.runUntil.milliseconds,
    start: toPersistedStart(scenario.start),
    steps: scenario.steps.map(toPersistedStep).toArray(),
});

/** A scenario from its persisted form, refusing one stored before orders had customers. */
export function fromPersistedScenario(scenario: IPersistedScenario): IScenario {
    refuseWithoutCustomers(scenario);
    const steps = scenario.steps.map(fromPersistedStep);
    return {
        name: scenario.name,
        description: scenario.description,
        version: toVersionId(scenario.version),
        seed: toSeed(scenario.seed),
        runUntil: toSimTime(scenario.runUntil),
        start: fromPersistedStart(scenario.start),
        steps: List(steps),
    };
}

/**
 * What tells a scenario's content apart from another's: its persisted form written out, which
 * has every field in a fixed order, so the same content gives the same key whatever a file's
 * spacing or order (FND-81).
 */
export function scenarioContentKey(scenario: IScenario): ScenarioContentKey {
    const persisted = toPersistedScenario(scenario);
    const text = JSON.stringify(persisted);
    return toScenarioContentKey(text);
}
