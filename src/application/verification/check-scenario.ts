import type { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import type { List } from 'immutable';

import { checkRun } from '../../application-core/verification/check-run';
import type { IRunCheck } from '../../domain/verification/check-run';
import type { BuiltInScenarios } from '../../application-core/scenarios/built-in-scenarios';
import type { IScenarioProblem, ScenarioResult } from '../../application-core/scenarios/scenario';
import type { IChosenFile, ScenarioFiles } from '../../application-core/scenarios/scenario-files';
import type { IScenarioRun } from '../scenarios/scenario-runner';
import { runScenarioResult } from '../scenarios/scenario-runner';
import type { BuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';

/**
 * A scenario that has run, and how it did. It passes when it reached its end and broke no
 * criterion.
 */
export interface ICheckedRun {
    readonly run: IScenarioRun;
    readonly check: IRunCheck;
    readonly isPassed: boolean;
}

/** How checking a scenario ended: the checked run, or what is wrong with the scenario. */
export type ScenarioCheckResult =
    | { readonly isOk: true; readonly checked: ICheckedRun }
    | { readonly isOk: false; readonly problems: List<IScenarioProblem> };

/**
 * Judges a scenario's run. A bug that stopped it fails it, whatever the criteria say of what it
 * did before that.
 */
export function judgeScenarioRun(run: IScenarioRun): ICheckedRun {
    const check = checkRun(run.entries);
    return { run, check, isPassed: check.isPassed && run.failure === null };
}

/**
 * Runs a scenario that was read, and judges the run. The browser and the command line both use
 * this.
 */
export function checkScenario(
    result: ScenarioResult,
    functions: FunctionLookup,
): ScenarioCheckResult {
    const ran = runScenarioResult(result, functions);
    if (!ran.isOk) {
        return ran;
    }
    return { isOk: true, checked: judgeScenarioRun(ran.run) };
}

/** Runs a built-in scenario, and judges the run. */
export function checkBuiltInScenario(
    library: BuiltInScenarios,
    id: BuiltInScenarioId,
    functions: FunctionLookup,
): ScenarioCheckResult {
    const result = library.scenario(id);
    return checkScenario(result, functions);
}

/** Reads a chosen scenario file, runs it, and judges the run. */
export async function checkScenarioFile(
    files: ScenarioFiles,
    file: IChosenFile,
    functions: FunctionLookup,
): Promise<ScenarioCheckResult> {
    const result = await files.readScenario(file);
    return checkScenario(result, functions);
}
