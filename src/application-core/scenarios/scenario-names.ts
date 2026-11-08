import type { IScenario } from './scenario';
import { ScriptedCommand } from './scripted-command';
import type { ScenarioStep } from './scripted-step';
import { isIndirectStep, isRulesStep } from './scripted-step';

/** Who and what a scenario names, which a step stated by hand can refer to (FND-89). */
export interface IScenarioNames {
    readonly drivers: readonly string[];
    readonly restaurants: readonly string[];
    /** The orders its create order steps name, in the order they are created. */
    readonly orders: readonly string[];
}

/** The order a step creates, or null for any other step. */
function createdBy(step: ScenarioStep): string | null {
    if (isRulesStep(step) || isIndirectStep(step)) {
        return null;
    }
    return step.command === ScriptedCommand.CreateOrder ? step.order : null;
}

/** The drivers, restaurants, and orders a scenario names. */
export function scenarioNames(scenario: IScenario): IScenarioNames {
    const { start } = scenario;
    const orders = scenario.steps
        .map(createdBy)
        .filter((order): order is string => order !== null)
        .toArray();
    return {
        drivers: start.drivers.map((driver) => driver.id).toArray(),
        restaurants: start.restaurants.map((restaurant) => restaurant.id).toArray(),
        orders,
    };
}
