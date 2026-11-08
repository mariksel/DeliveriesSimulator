import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import { changedValues } from '../../application-core/simulation-engine/run-value-changes';
import { startingValues } from '../../application-core/simulation-engine/run-state';
import { toParameterValue } from '../../domain/business-rules/numbers';
import { toParameterId } from '../../domain/business-rules/parameter';
import { ParameterChange } from '../../domain/business-rules/parameter-change';
import { toRuleId } from '../../domain/business-rules/rule';
import { toSeed } from '../../domain/simulation-engine/numbers';
import type { IRuleEdit } from './rules-view';
import { ruleEditResult, rulesPanelView } from './rules-view';

const SEED = toSeed(1);
const V1 = startingValues({ seed: SEED });

const PASS = 'drivers.dispatch-pass';
const NEAR = 'drivers.near-restaurant';

const edit = (ruleId: string, parameterId: string, text: string): IRuleEdit => ({
    ruleId: toRuleId(ruleId),
    parameterId: toParameterId(parameterId),
    text,
});

describe('the Rules panel', () => {
    it("lists Orders', Drivers', and Deliveries' rules, each module's in order", () => {
        const modules = rulesPanelView(V1);

        const names = modules.map((module) => module.name);
        expect(names).toEqual(['Orders', 'Drivers', 'Deliveries']);
        const drivers = modules[1]!.rules.map((rule) => rule.id);
        const eligibility = drivers.slice(0, 5);
        expect(eligibility).toEqual([
            'drivers.same-area',
            'drivers.online',
            'drivers.fresh-location',
            'drivers.near-restaurant',
            'drivers.not-busy',
        ]);
    });

    it('shows what a rule says, its source, its kind, and its parameters', () => {
        const modules = rulesPanelView(V1);

        const pass = modules[1]!.rules.find((rule) => rule.id === 'drivers.dispatch-pass');
        expect(pass).toMatchObject({
            name: 'Dispatch pass',
            source: 'V1.0.0 business rules: Notification sequence',
            kind: 'Calculation',
            parameters: [
                {
                    key: 'drivers.dispatch-pass interval',
                    kind: 'Duration, as h00:m00:s00:ms00',
                    value: 'h00:m00:s30:ms00',
                    defaultValue: 'h00:m00:s30:ms00',
                    range: 'h00:m00:s05:ms00 to h00:m05:s00:ms00',
                    isOutOfRange: false,
                    isDefault: true,
                },
            ],
        });
    });

    it('shows a check with no parameters as one with none', () => {
        const modules = rulesPanelView(V1);

        const online = modules[1]!.rules.find((rule) => rule.id === 'drivers.online');
        expect(online?.parameters).toEqual([]);
    });

    it('marks a changed value, and one outside its valid range', () => {
        const ruleId = toRuleId(NEAR);
        const parameterId = toParameterId('max-distance');
        const value = toParameterValue(-5);
        const change = ParameterChange.create({ ruleId, parameterId, value });
        const changes = List([change]);
        const { values } = changedValues(V1, changes);

        const modules = rulesPanelView(values);

        const rule = modules[1]!.rules.find((each) => each.id === 'drivers.near-restaurant');
        expect(rule?.parameters[0]).toMatchObject({
            kind: 'Distance, in metres',
            value: '-5',
            range: '500 to 10000',
            isOutOfRange: true,
            isDefault: false,
        });
    });
});

describe('a value typed into the Rules panel', () => {
    it('becomes a change, a duration written as a time', () => {
        const typed = edit(PASS, 'interval', ' h00:m00:s10:ms00 ');

        const result = ruleEditResult(V1, typed);

        expect(result).toMatchObject({
            isOk: true,
            change: { ruleId: 'drivers.dispatch-pass', parameterId: 'interval', value: 10_000 },
        });
    });

    it.each<[string, string, string, string, string]>([
        [
            'a duration as a number',
            PASS,
            'interval',
            '10000',
            'Write a duration as a time, such as h00:m00:s30:ms00.',
        ],
        [
            'a blank number',
            'drivers.ranking-score',
            'boost-busy',
            ' ',
            'Write a number, such as 2.5.',
        ],
        [
            'text for a number',
            'drivers.ranking-score',
            'boost-busy',
            'half',
            'Write a number, such as 2.5.',
        ],
        [
            'a value a run cannot use',
            'drivers.not-busy',
            'busy-at-picked-up-orders',
            '2.5',
            'The value must be a whole number from 0.',
        ],
        [
            'an unknown parameter',
            'drivers.online',
            'speed',
            '1',
            'This rule has no such parameter.',
        ],
    ])('is refused when it is %s', (_name, ruleId, parameterId, text, message) => {
        const typed = edit(ruleId, parameterId, text);

        const result = ruleEditResult(V1, typed);

        expect(result).toEqual({
            isOk: false,
            problem: { key: `${ruleId} ${parameterId}`, message },
        });
    });

    it('becomes a change even outside its valid range', () => {
        const typed = edit(NEAR, 'max-distance', '-5');

        const result = ruleEditResult(V1, typed);

        expect(result.isOk).toBe(true);
    });
});
