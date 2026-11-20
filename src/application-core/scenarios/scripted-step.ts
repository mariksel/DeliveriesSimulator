import type { List } from 'immutable';

import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { NewDriver } from '../../domain/drivers/driver';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { City } from '../../domain/map-and-routing/city';
import type { Customer, CustomerId } from '../../domain/restaurants/customers/customer';
import type {
    AddressId,
    DeliveryAddress,
} from '../../domain/restaurants/customers/delivery-address';
import type { ScriptedCommand } from './scripted-command';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { IndirectStatement } from '../simulation-engine/indirect-effect';
import type { IFunctionUse, IndirectLabel } from '../simulation-engine/run-input';
import type { IRider } from '../simulation-engine/rider';

/** Whoever acts in a scenario's step, by the scenario's own name: a restaurant or a driver. */
export type ScenarioActor = string & { readonly brand: 'ScenarioActor' };
/** Marks text as a scenario's name for whoever acts in a step. */
export const toScenarioActor = (value: string): ScenarioActor => value as ScenarioActor;

/** A scenario's own name for an order. The run gives the order its real ID when it is made. */
export type ScenarioOrderName = string & { readonly brand: 'ScenarioOrderName' };
/** Marks text as a scenario's own name for an order. */
export const toScenarioOrderName = (value: string): ScenarioOrderName =>
    value as ScenarioOrderName;

/** One action by a restaurant or a driver, at a stated simulated time. */
export interface IScriptedStep {
    readonly at: SimTime;
    /** The restaurant or driver acting. */
    readonly actor: ScenarioActor;
    readonly command: ScriptedCommand;
    /** The scenario's own name for the order. The run gives it its real ID when it is created. */
    readonly order: ScenarioOrderName;
    /** The label of an earlier indirect step this action follows from, if any (FND-89). */
    readonly after?: IndirectLabel;
    /** For create-order only: the customer the order is for, of the acting restaurant (FND-90). */
    readonly customer?: CustomerId;
    /** For create-order only: which of the customer's addresses it goes to. */
    readonly address?: AddressId;
    /**
     * For a pick-up or delivery: run at its time even if the driver has not arrived, to test a
     * driver who reports early. Otherwise it waits for them (FND-90).
     */
    readonly isAtItsTime?: boolean;
}

/**
 * A step that states a decision or change outside the service, at a stated simulated time, as an
 * indirect commit (FND-89).
 */
export interface IIndirectStep {
    readonly at: SimTime;
    readonly indirect: IndirectStatement;
}

/** A step that changes rule parameters at a stated simulated time, by rule ID (FND-84). */
export interface IRulesStep {
    readonly at: SimTime;
    readonly set: List<ParameterChange>;
    /** The label of an earlier indirect step that led to the change, if one did (FND-89). */
    readonly after?: IndirectLabel;
}

/**
 * A step that switches state functions to other versions at a stated simulated time, by name
 * (FND-81).
 */
export interface IUseStep {
    readonly at: SimTime;
    readonly use: List<IFunctionUse>;
    /** The label of an earlier indirect step that led to the switch, if one did (FND-89). */
    readonly after?: IndirectLabel;
}

/**
 * One step of a scenario: an action by a restaurant or a driver, rules to change, functions to
 * switch, or an indirect effect.
 */
export type ScenarioStep = IScriptedStep | IRulesStep | IUseStep | IIndirectStep;

/** Whether a scenario's step changes rules, rather than being an action. */
export const isRulesStep = (step: ScenarioStep): step is IRulesStep => 'set' in step;

/** Whether a scenario's step switches functions to other versions. */
export const isUseStep = (step: ScenarioStep): step is IUseStep => 'use' in step;

/** Whether a scenario's step states an indirect effect. */
export const isIndirectStep = (step: ScenarioStep): step is IIndirectStep => 'indirect' in step;

/** The city, who exists when a scripted run begins, and the rule changes it starts with. */
export interface IScriptedStart {
    /**
     * The scenario's city (FND-90). None only for a scenario stored before scenarios had cities,
     * until I03-E09-001-P03 gives each of those one.
     */
    readonly city: City | null;
    readonly restaurants: List<RestaurantPlace>;
    /** The restaurants' customers, whom orders are for (FND-90). */
    readonly customers: List<Customer>;
    /** The customers' stored delivery addresses. */
    readonly addresses: List<DeliveryAddress>;
    readonly drivers: List<NewDriver>;
    /**
     * The drivers as the simulator rides them: how often each one's app sends its location, and
     * how fast they ride (FND-90).
     */
    readonly riders: List<IRider>;
    /** None, unless the scenario sets some. */
    readonly rules?: List<ParameterChange>;
}
