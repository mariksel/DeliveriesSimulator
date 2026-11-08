import { describe, expect, it } from 'vitest';

import { isRulesStep } from '../../application-core/scenarios/scripted-step';
import { readScenario } from './read-scenario';

const BASE = {
    format: 1,
    name: 'Rules',
    version: 'V1.0.0',
    seed: 1,
    runUntil: 'h00:m10:s00:ms00',
    restaurants: [],
    drivers: [],
};

function scenarioWith(fields: Record<string, unknown>): unknown {
    return { ...BASE, steps: [], ...fields };
}

function problemsOf(value: unknown): string[] {
    const result = readScenario(value);
    return result.isOk
        ? []
        : result.problems.map((problem) => `${problem.path}: ${problem.message}`).toArray();
}

function warningsOf(value: unknown): string[] {
    const result = readScenario(value);
    const warnings = result.isOk ? (result.warnings?.toArray() ?? []) : [];
    return warnings.map((warning) => `${warning.path}: ${warning.message}`);
}

const PASS = { rule: 'drivers.dispatch-pass', parameter: 'interval', value: 'h00:m00:s10:ms00' };
const DISTANCE = { rule: 'drivers.near-restaurant', parameter: 'max-distance', value: 2000 };

describe("a scenario's rule settings", () => {
    it('set the start, with a duration in the time notation and a distance as a number', () => {
        const value = scenarioWith({ rules: [PASS, DISTANCE] });

        const result = readScenario(value);

        expect(result.isOk).toBe(true);
        const rules = result.isOk ? (result.scenario.start.rules?.toArray() ?? []) : [];
        expect(rules).toEqual([
            { ruleId: 'drivers.dispatch-pass', parameterId: 'interval', value: 10_000 },
            { ruleId: 'drivers.near-restaurant', parameterId: 'max-distance', value: 2000 },
        ]);
        const warnings = warningsOf(value);
        expect(warnings).toEqual([]);
    });

    it('are left out when the scenario sets none', () => {
        const value = scenarioWith({});

        const result = readScenario(value);

        const size = result.isOk ? result.scenario.start.rules?.size : -1;
        expect(size).toBe(0);
    });

    it('set rules at a step, in time order with the others', () => {
        const value = scenarioWith({
            steps: [{ at: 'h00:m01:s00:ms00', set: [PASS] }],
        });

        const result = readScenario(value);

        const step = result.isOk ? result.scenario.steps.first() : undefined;
        const isRules = step !== undefined && isRulesStep(step);
        expect(isRules).toBe(true);
        expect(step).toMatchObject({ at: 60_000 });
    });

    it('warn about a value outside its valid range, and still use it', () => {
        const far = { ...DISTANCE, value: -5 };
        const slow = { ...PASS, value: 'h00:m10:s00:ms00' };
        const value = scenarioWith({
            rules: [far],
            steps: [{ at: 'h00:m00:s00:ms00', set: [slow] }],
        });

        const warnings = warningsOf(value);

        expect(warnings).toEqual([
            'rules[0].value: is outside its valid range, from 500 to 10000',
            'steps[0].set[0].value: is outside its valid range, from h00:m00:s05:ms00 to h00:m05:s00:ms00',
        ]);
        const problems = problemsOf(value);
        expect(problems).toEqual([]);
    });

    it.each<[string, Record<string, unknown>, string]>([
        [
            'an unknown rule',
            { rule: 'drivers.teleport', parameter: 'x', value: 1 },
            'rules[0].rule: "drivers.teleport" is not a rule of this version',
        ],
        [
            'an unknown parameter',
            { rule: 'drivers.dispatch-pass', parameter: 'speed', value: 1 },
            'rules[0].parameter: "speed" is not a parameter of drivers.dispatch-pass',
        ],
        [
            'a duration as a number',
            { ...PASS, value: 10_000 },
            'rules[0].value: must be text that is not blank',
        ],
        ['a distance as text', { ...DISTANCE, value: '2 km' }, 'rules[0].value: must be a number'],
        [
            'a missing value',
            { rule: 'drivers.near-restaurant', parameter: 'max-distance' },
            'rules[0].value: is missing',
        ],
        [
            'a value a run cannot use',
            { ...PASS, value: 'h00:m00:s00:ms00' },
            'rules[0].value: must be a whole number above 0',
        ],
        ['a missing rule', { parameter: 'interval', value: 1 }, 'rules[0].rule: is missing'],
        [
            'an unknown field',
            { ...DISTANCE, unit: 'm' },
            'rules[0].unit: is not a field of this format',
        ],
    ])('refuse %s', (_name, setting, problem) => {
        const value = scenarioWith({ rules: [setting] });

        const problems = problemsOf(value);

        expect(problems).toEqual([problem]);
    });

    it.each<[string, unknown, string]>([
        ['a list that is not one', 'fast', 'rules: must be a list'],
        ['an entry without fields', [5], 'rules[0]: must have fields'],
    ])('refuse %s', (_name, rules, problem) => {
        const value = scenarioWith({ rules });

        const problems = problemsOf(value);

        expect(problems).toEqual([problem]);
    });

    it('refuse a rules step out of time order, or with an unknown field', () => {
        const value = scenarioWith({
            steps: [
                { at: 'h00:m02:s00:ms00', set: [PASS] },
                { at: 'h00:m01:s00:ms00', set: [PASS], actor: 'driver-1' },
            ],
        });

        const problems = problemsOf(value);

        expect(problems).toEqual([
            'steps[1].actor: is not a field of this format',
            'steps[1].at: is before the step above it: steps must be in time order',
        ]);
    });

    it('refuse a rules step whose set is not a list', () => {
        const value = scenarioWith({ steps: [{ at: 'h00:m01:s00:ms00', set: 'fast' }] });

        const problems = problemsOf(value);

        expect(problems).toEqual(['steps[0].set: must be a list']);
    });
});
