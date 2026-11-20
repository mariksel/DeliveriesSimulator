import type { List } from 'immutable';

import { toInputActor, toInputOrderName } from '../simulation-engine/run-input';
import type { IRunStart, ScriptInput } from '../simulation-engine/run-input';
import { scheduleInputs } from '../simulation-engine/run-inputs';
import type { IRunState } from '../simulation-engine/run-state';
import type { IScriptedStart, ScenarioStep } from './scripted-step';
import { isIndirectStep, isRulesStep, isUseStep } from './scripted-step';

/** A scenario's step, as the run input the engine performs. */
function inputOf(step: ScenarioStep): ScriptInput {
    if (isRulesStep(step)) {
        const after = step.after === undefined ? {} : { after: step.after };
        return { at: step.at, changes: step.set, ...after };
    }
    if (isUseStep(step)) {
        const after = step.after === undefined ? {} : { after: step.after };
        return { at: step.at, uses: step.use, ...after };
    }
    if (isIndirectStep(step)) {
        return step;
    }
    const actor = toInputActor(step.actor);
    const order = toInputOrderName(step.order);
    const after = step.after === undefined ? {} : { after: step.after };
    const destination =
        step.customer === undefined || step.address === undefined
            ? {}
            : { customer: step.customer, address: step.address };
    const timing = step.isAtItsTime === true ? { isAtItsTime: true } : {};
    return {
        at: step.at,
        actor,
        command: step.command,
        order,
        ...after,
        ...destination,
        ...timing,
    };
}

/**
 * Sets up a scenario's starting state, with its rules, and gives the run its script, each step
 * as one of the engine's inputs. Steps run in time order, and steps due at the same time run in
 * the given order.
 */
export function scheduleScenario(
    run: IRunState,
    start: IScriptedStart,
    steps: List<ScenarioStep>,
): IRunState {
    const runStart: IRunStart = {
        ...(start.city === null ? {} : { city: start.city }),
        restaurants: start.restaurants,
        customers: start.customers,
        addresses: start.addresses,
        drivers: start.drivers,
        riders: start.riders,
        ...(start.rules === undefined ? {} : { rules: start.rules }),
    };
    const inputs = steps.map(inputOf);
    return scheduleInputs(run, runStart, inputs);
}
