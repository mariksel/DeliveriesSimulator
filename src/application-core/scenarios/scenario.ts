import { List } from 'immutable';

import type { VersionId } from '../../domain/versions/version-id';
import type { IScriptedStart, ScenarioStep } from './scripted-step';
import type { Seed } from '../../domain/simulation-engine/numbers';
import type { SimTime } from '../../domain/simulation-engine/sim-time';

/** A scenario read from its file, in the form a run needs. */
export interface IScenario {
    readonly name: string;
    readonly description: string | null;
    readonly version: VersionId;
    readonly seed: Seed;
    /** Milliseconds since the run began. */
    readonly runUntil: SimTime;
    readonly start: IScriptedStart;
    readonly steps: List<ScenarioStep>;
}

/**
 * One thing wrong with a scenario, or one thing to warn about: where it is, and what is wrong or
 * unusual there.
 */
export interface IScenarioProblem {
    readonly path: string;
    readonly message: string;
}

/**
 * How reading a scenario ended: the scenario with its warnings, such as a rule value outside its
 * valid range, or everything wrong with it.
 */
export type ScenarioResult =
    | {
          readonly isOk: true;
          readonly scenario: IScenario;
          /** None, when absent. */
          readonly warnings?: List<IScenarioProblem>;
      }
    | { readonly isOk: false; readonly problems: List<IScenarioProblem> };

/** One thing wrong, as a list to add to the others. */
export const problemAt = (path: string, message: string): List<IScenarioProblem> =>
    List.of({ path, message });

/** A scenario that could not be read at all, for this reason. */
export const refusedScenario = (message: string): ScenarioResult => ({
    isOk: false,
    problems: problemAt('', message),
});
