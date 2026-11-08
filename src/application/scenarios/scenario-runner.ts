import type { List } from 'immutable';

import { runDigest } from '../../application-core/simulation-engine/run-digest';
import type { IRunFailure } from '../../application-core/simulation-engine/run-failure';
import type { RunLogEntry } from '../../application-core/simulation-engine/run-state';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { scheduleScenario } from '../../application-core/scenarios/schedule-scenario';
import { SimulationRun } from '../simulation-engine/simulation-run';
import type {
    IScenario,
    IScenarioProblem,
    ScenarioResult,
} from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';

/** The versions this simulator can run. The Versions module takes this over in I06. */
const AVAILABLE_VERSIONS: readonly string[] = ['V1.0.0'];

const versionProblems = (): List<IScenarioProblem> =>
    problemAt('version', `is not available: this simulator has ${AVAILABLE_VERSIONS.join(', ')}`);

/** A scenario that has run as far as it could, with its whole event log. */
export interface IScenarioRun {
    readonly scenario: IScenario;
    readonly entries: List<RunLogEntry>;
    /** Two runs with the same digest match event for event. */
    readonly digest: string;
    /** The bug that stopped the run early, or null when it reached its end. */
    readonly failure: IRunFailure | null;
}

/** How running a scenario ended: the run, or what is wrong with the scenario. */
export type ScenarioRunResult =
    | { readonly isOk: true; readonly run: IScenarioRun }
    | { readonly isOk: false; readonly problems: List<IScenarioProblem> };

/** Runs a scenario to its end. Speed never changes a run, so this goes straight through. */
export function runScenario(scenario: IScenario): ScenarioRunResult {
    if (!AVAILABLE_VERSIONS.includes(scenario.version)) {
        return { isOk: false, problems: versionProblems() };
    }
    const created = createRun({ seed: scenario.seed });
    const start = scheduleScenario(created, scenario.start, scenario.steps);
    const run = new SimulationRun(start);
    run.advanceTo(scenario.runUntil);
    const entries = run.state.cache.log.entries;
    return {
        isOk: true,
        run: { scenario, entries, digest: runDigest(entries), failure: run.failure },
    };
}

/** A scenario that was read, if this simulator can run it, or what is wrong with it. */
export function runnableScenario(result: ScenarioResult): ScenarioResult {
    if (!result.isOk || AVAILABLE_VERSIONS.includes(result.scenario.version)) {
        return result;
    }
    return { isOk: false, problems: versionProblems() };
}

/** Runs a scenario that was read, unless it has problems. */
export function runScenarioResult(result: ScenarioResult): ScenarioRunResult {
    return result.isOk ? runScenario(result.scenario) : result;
}
