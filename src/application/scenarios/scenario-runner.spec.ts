import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import { ONE_ORDER_DIGEST } from '../../../e2e/fixtures/one-order-digest';
import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import type { IScenario, IScenarioProblem } from '../../application-core/scenarios/scenario';
import { checkDeterminism } from '../simulation-engine/determinism-check';
import type { IScenarioRun, ScenarioRunResult } from './scenario-runner';
import { runnableScenario, runScenario, runScenarioResult } from './scenario-runner';
import { toVersionId } from '../../domain/versions/version-id';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import type { IIndirectStep, IScriptedStep } from '../../application-core/scenarios/scripted-step';
import { DRIVER_IGNORES } from '../../application-core/simulation-engine/indirect-effects.testing';
import { toIndirectLabel } from '../../application-core/simulation-engine/run-input';

/** h00:m00:s03:ms00. */
const THREE_SECONDS = toSimTime(3000);

const NOT_AVAILABLE: IScenarioProblem = {
    path: 'version',
    message: 'is not available: this simulator has V1.0.0',
};

const problemsOf = (result: ScenarioRunResult): IScenarioProblem[] =>
    result.isOk ? [] : result.problems.toArray();

function completed(scenario: IScenario = ONE_ORDER_SCENARIO): IScenarioRun {
    const result = runScenario(scenario);
    if (!result.isOk) {
        throw new Error(`The scenario did not run: ${result.problems.size} problems.`);
    }
    return result.run;
}

describe('the scenario runner', () => {
    it('runs a scenario through both modules, to delivered', () => {
        const run = completed();
        const kinds = run.entries
            .filter((entry) => entry.source === 'orders')
            .map((entry) => entry.kind)
            .toArray();

        expect(kinds).toContain('OrderDelivered');
        expect(run.entries.filter((entry) => entry.kind === 'CommandRefused').size).toBe(0);
    });

    it('gives the pinned digest, which the browser and the command line must also give', () => {
        expect(completed().digest).toBe(ONE_ORDER_DIGEST);
    });

    it('repeats exactly', () => {
        const runDifference = checkDeterminism(() => completed().entries);
        expect(runDifference).toBeNull();
    });

    it('runs from another seed too', () => {
        const changed = { ...ONE_ORDER_SCENARIO, seed: toSeed(7) };

        expect(completed(changed).entries.size).toBe(completed().entries.size);
    });

    it('runs indirect steps, and an action that follows from one, still to delivered', () => {
        const ignored: IIndirectStep = { at: toSimTime(45_000), indirect: DRIVER_IGNORES };
        const accept = ONE_ORDER_SCENARIO.steps.get(3) as IScriptedStep;
        const following: IScriptedStep = { ...accept, after: toIndirectLabel('ignored') };
        const steps = ONE_ORDER_SCENARIO.steps.insert(3, ignored).set(4, following);
        const scenario = { ...ONE_ORDER_SCENARIO, steps };

        const run = completed(scenario);

        const kinds = run.entries.map((entry) => entry.kind).toArray();
        expect(kinds).toContain('IndirectEffectHappened');
        expect(kinds).toContain('OrderDelivered');
        expect(run.digest).not.toBe(ONE_ORDER_DIGEST);
    });

    it('stops at runUntil', () => {
        const shorter = {
            ...ONE_ORDER_SCENARIO,
            runUntil: THREE_SECONDS,
            steps: ONE_ORDER_SCENARIO.steps.take(2),
        };
        const run = completed(shorter);

        expect(run.entries.last()!.at.sinceStart.milliseconds).toBeLessThanOrEqual(
            THREE_SECONDS.milliseconds,
        );
        const array = run.entries.map((entry) => entry.kind).toArray();
        expect(array).not.toContain('OrderDelivered');
    });

    it('passes on what is wrong with a scenario that could not be read, without running it', () => {
        const problems = List.of({ path: 'seed', message: 'is missing' });

        const result = runScenarioResult({ isOk: false, problems });

        const passedOn = problemsOf(result);
        expect(passedOn).toEqual([{ path: 'seed', message: 'is missing' }]);
    });

    it('runs a scenario that was read', () => {
        const result = runScenarioResult({ isOk: true, scenario: ONE_ORDER_SCENARIO });

        expect(result.isOk && result.run.digest).toBe(ONE_ORDER_DIGEST);
    });

    it('refuses a version this simulator does not have', () => {
        const run = completed();

        const result = runScenario({ ...run.scenario, version: toVersionId('V9.9.9') });
        const problems = problemsOf(result);
        expect(problems).toEqual([NOT_AVAILABLE]);
    });

    it('has no failure when a run reaches its end', () => {
        expect(completed().failure).toBeNull();
    });
});

describe('a runnable scenario', () => {
    it('is one this simulator has the version of', () => {
        const read = { isOk: true, scenario: ONE_ORDER_SCENARIO } as const;

        const result = runnableScenario(read);
        expect(result).toBe(read);
    });

    it('is not one for a version this simulator does not have', () => {
        const scenario = { ...ONE_ORDER_SCENARIO, version: toVersionId('V9.9.9') };

        const result = runnableScenario({ isOk: true, scenario });

        const problems = result.isOk ? [] : result.problems.toArray();
        expect(problems).toEqual([NOT_AVAILABLE]);
    });
});
