import type { List } from 'immutable';

import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { NewDriver } from '../../domain/drivers/driver';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { ScriptedCommand } from './scripted-command';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { IndirectStatement } from '../simulation-engine/indirect-effect';
import type { IndirectLabel } from '../simulation-engine/run-input';

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
}

/**
 * One step of a scenario: an action by a restaurant or a driver, rules to change, or an indirect
 * effect.
 */
export type ScenarioStep = IScriptedStep | IRulesStep | IIndirectStep;

/** Whether a scenario's step changes rules, rather than being an action. */
export const isRulesStep = (step: ScenarioStep): step is IRulesStep => 'set' in step;

/** Whether a scenario's step states an indirect effect. */
export const isIndirectStep = (step: ScenarioStep): step is IIndirectStep => 'indirect' in step;

/** Who exists when a scripted run begins, and the changes to the rules it starts with. */
export interface IScriptedStart {
    readonly restaurants: List<RestaurantPlace>;
    readonly drivers: List<NewDriver>;
    /** None, unless the scenario sets some. */
    readonly rules?: List<ParameterChange>;
}
