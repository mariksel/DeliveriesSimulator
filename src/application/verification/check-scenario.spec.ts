import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import { checkRun } from '../../application-core/verification/check-run';
import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import type { IScenario, ScenarioResult } from '../../application-core/scenarios/scenario';
import {
    BuiltInsForTest,
    FilesForTest,
    INVALID_FILE,
    NOT_JSON,
    ONE_ORDER_FILE,
} from '../../application-core/scenarios/scenario-ports.testing';
import type { ScenarioStep } from '../../application-core/scenarios/scripted-step';
import type { IScenarioRun } from '../scenarios/scenario-runner';
import { runScenario } from '../scenarios/scenario-runner';
import type { ScenarioCheckResult } from './check-scenario';
import {
    checkBuiltInScenario,
    checkScenario,
    checkScenarioFile,
    judgeScenarioRun,
} from './check-scenario';
import { toBuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

const ONE_ORDER_BUILT_IN = toBuiltInScenarioId('one-order');
const NO_SUCH_BUILT_IN = toBuiltInScenarioId('nope');

const isPassed = (result: ScenarioCheckResult): boolean => result.isOk && result.checked.isPassed;
const problemsOf = (result: ScenarioCheckResult): unknown[] =>
    result.isOk ? [] : result.problems.toArray();

const read = (scenario: IScenario): ScenarioResult => ({ isOk: true, scenario });

function ran(scenario: IScenario): IScenarioRun {
    const result = runScenario(scenario);
    if (!result.isOk) {
        throw new Error(`The scenario did not run: ${result.problems.size} problems.`);
    }
    return result.run;
}

function namesOfViolated(scenario: IScenario): string[] {
    const { entries } = ran(scenario);
    return checkRun(entries)
        .results.filter((result) => !result.violations.isEmpty())
        .map((result) => result.criterion);
}

const STEPS = ONE_ORDER_SCENARIO.steps;
const NO_STEPS = List<ScenarioStep>();
const withSteps = (steps: List<ScenarioStep>): IScenario => ({ ...ONE_ORDER_SCENARIO, steps });
const FIRST_FIVE = STEPS.take(5);
const UNDELIVERED = withSteps(FIRST_FIVE);

/** h00:m04:s01:ms00, just after the inbox jobs ran. */
const JUST_AFTER_INBOX_JOBS = toSimTime(241_000);
/** h00:m04:s02:ms00, before the inbox jobs run again. */
const BEFORE_INBOX_JOBS_AGAIN = toSimTime(242_000);

describe('checking real runs', () => {
    it('passes the happy path on every criterion', () => {
        expect(checkRun(ran(ONE_ORDER_SCENARIO).entries).isPassed).toBe(true);
    });

    it('gives a result for each of the four criteria', () => {
        const { entries } = ran(ONE_ORDER_SCENARIO);
        const results = checkRun(entries).results.map((result) => result.criterion);
        expect(results).toEqual([
            'Valid final state',
            'Modules agree',
            'Exactly-once effect',
            'Outbox for every event',
        ]);
    });

    it('passes a run with no orders, since nothing went wrong', () => {
        const scenario = withSteps(NO_STEPS);
        const violated = namesOfViolated(scenario);
        expect(violated).toEqual([]);
    });

    it.each<[string, List<ScenarioStep>, number]>([
        ['none', NO_STEPS, 0],
        ['one', STEPS, 1],
    ])('counts the orders it judged: %s', (_name, steps, judged) => {
        const scenario = withSteps(steps);
        const scenarioRead = read(scenario);
        const result = checkScenario(scenarioRead);

        expect(result.isOk && result.checked.check.ordersJudged).toBe(judged);
    });

    it('fails an order that is never delivered, on its final state', () => {
        const violated = namesOfViolated(UNDELIVERED);
        expect(violated).toEqual(['Valid final state']);
    });

    it('fails a run that stops while events are still flowing', () => {
        const lastStep = { ...STEPS.last()!, at: JUST_AFTER_INBOX_JOBS };
        const steps = STEPS.butLast().push(lastStep);
        const shorter = { ...withSteps(steps), runUntil: BEFORE_INBOX_JOBS_AGAIN };

        const violated = namesOfViolated(shorter);
        expect(violated).toEqual(['Modules agree', 'Exactly-once effect']);
    });

    it('links a violation to the log entry that shows it', () => {
        const { entries } = ran(UNDELIVERED);

        const violation = checkRun(entries).results[0]?.violations.first();

        expect(violation?.sequence).toBe(
            entries.findLast(
                (entry) => entry.source === 'orders' && entry.kind === 'OutboxEventWritten',
            )?.sequence,
        );
    });
});

describe('checking a scenario', () => {
    const library = new BuiltInsForTest();

    it('runs and judges a built-in scenario', () => {
        const result = checkBuiltInScenario(library, ONE_ORDER_BUILT_IN);
        const isResultPassed = isPassed(result);
        expect(isResultPassed).toBe(true);
    });

    it('says so when there is no such built-in scenario', () => {
        const result = checkBuiltInScenario(library, NO_SUCH_BUILT_IN);
        const problems = problemsOf(result);
        expect(problems).toEqual([{ path: '', message: 'there is no built-in scenario "nope"' }]);
    });

    it('fails a run that breaks a criterion', () => {
        const scenarioRead = read(UNDELIVERED);
        const result = checkScenario(scenarioRead);
        const isResultPassed = isPassed(result);
        expect(isResultPassed).toBe(false);
    });

    it('fails a run a bug stopped, even with every criterion met', () => {
        const scenario = withSteps(NO_STEPS);
        const run = ran(scenario);

        const judged = judgeScenarioRun({
            ...run,
            failure: { at: toSimTime(0), message: 'a bug', work: null as never },
        });

        expect(judged.check.isPassed).toBe(true);
        expect(judged.isPassed).toBe(false);
    });

    it('passes on what is wrong with a scenario that could not be read', () => {
        const result = checkScenario({
            isOk: false,
            problems: List.of({ path: 'seed', message: 'is missing' }),
        });
        const problems = problemsOf(result);
        expect(problems).toEqual([{ path: 'seed', message: 'is missing' }]);
    });

    it('runs a chosen file', async () => {
        const files = new FilesForTest();
        const result = await checkScenarioFile(files, { name: ONE_ORDER_FILE });

        const isResultPassed = isPassed(result);
        expect(isResultPassed).toBe(true);
    });

    it("passes on what is wrong with a chosen file's scenario", async () => {
        const files = new FilesForTest();
        const result = await checkScenarioFile(files, { name: INVALID_FILE });

        const problems = problemsOf(result);
        expect(problems).toEqual([{ path: '', message: NOT_JSON }]);
    });
});
