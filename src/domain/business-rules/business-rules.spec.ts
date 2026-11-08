import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { Calculation } from './calculation';
import { Check, firstFailed } from './check';
import { Limit } from './limit';
import { toParameterValue } from './numbers';
import type { ParameterValue } from './numbers';
import { Parameter, toParameterId } from './parameter';
import { ParameterChange } from './parameter-change';
import { isOfKind, kindRequirement, ParameterKind } from './parameter-kind';
import { Rule, toRuleId } from './rule';
import { RuleKind } from './rule-kind';
import { RuleSet } from './rule-set';
import { isUsable, usableRequirement, UsableValues } from './usable-values';
import { ValidRange } from './valid-range';

const value = (number: number): ParameterValue => toParameterValue(number);

function range(lowest: number, highest: number): ValidRange {
    const low = value(lowest);
    const high = value(highest);
    return ValidRange.create({ lowest: low, highest: high });
}

function parameter(
    id: string,
    kind: ParameterKind,
    defaultValue: number,
    usable: UsableValues = UsableValues.AnyOfItsKind,
): Parameter {
    const parameterId = toParameterId(id);
    const defaultOf = value(defaultValue);
    const validRange = range(0, 1000);
    return Parameter.create({
        id: parameterId,
        name: id,
        text: `The ${id}.`,
        kind,
        usable,
        defaultValue: defaultOf,
        range: validRange,
    });
}

function rule(id: string, kind: RuleKind, parameters: readonly Parameter[]): Rule {
    const ruleId = toRuleId(id);
    const list = List(parameters);
    return Rule.create({
        id: ruleId,
        name: id,
        text: `What ${id} says.`,
        source: 'A rules page',
        kind,
        parameters: list,
    });
}

const MAX_AGE = parameter('max-age', ParameterKind.Duration, 300);
const MAX_DISTANCE = parameter('max-distance', ParameterKind.Distance, 3);
const INTERVAL = parameter('interval', ParameterKind.Duration, 30, UsableValues.WholeAboveZero);
const FRESH = rule('test.fresh', RuleKind.Check, [MAX_AGE]);
const NEAR = rule('test.near', RuleKind.Check, [MAX_DISTANCE]);
const PASS = rule('test.pass', RuleKind.Limit, [INTERVAL]);
const RULES = List([FRESH, NEAR, PASS]);

function change(ruleId: string, parameterId: string, number: number): ParameterChange {
    const ruleOf = toRuleId(ruleId);
    const parameterOf = toParameterId(parameterId);
    const valueOf = value(number);
    return ParameterChange.create({ ruleId: ruleOf, parameterId: parameterOf, value: valueOf });
}

describe('rule and parameter IDs', () => {
    it.each(['drivers.fresh-location', 'drivers.deliveries.inbox-read-lag', 'orders.v2'])(
        'take %s',
        (id) => {
            const ruleId = toRuleId(id);

            expect(ruleId).toBe(id);
        },
    );

    it.each(['drivers', 'Drivers.fresh', 'drivers.fresh_location', 'drivers..fresh', '.drivers'])(
        'refuse %s as a rule ID',
        (id) => {
            expect(() => toRuleId(id)).toThrow(RangeError);
        },
    );

    it('take a kebab-case parameter ID and refuse anything else', () => {
        const id = toParameterId('max-age');

        expect(id).toBe('max-age');
        expect(() => toParameterId('max.age')).toThrow(RangeError);
        expect(() => toParameterId('maxAge')).toThrow(RangeError);
    });
});

describe('a parameter value', () => {
    it('must be a finite number', () => {
        const negative = value(-5);

        expect(negative).toBe(-5);
        expect(() => toParameterValue(Number.NaN)).toThrow(RangeError);
        expect(() => toParameterValue(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    });

    it.each([
        [ParameterKind.Duration, 2.5, true],
        [ParameterKind.Duration, -1, false],
        [ParameterKind.Count, 3, true],
        [ParameterKind.Count, 2.5, false],
        [ParameterKind.Distance, -500, true],
        [ParameterKind.Multiplier, -0.5, true],
    ])('of kind %s may be %s: %s', (kind, number, isExpected) => {
        const parameterValue = value(number);

        const isKindValue = isOfKind(kind, parameterValue);

        expect(isKindValue).toBe(isExpected);
    });

    it.each([
        [ParameterKind.Duration, 'a number of milliseconds from 0'],
        [ParameterKind.Count, 'a whole number from 0'],
        [ParameterKind.Distance, null],
        [ParameterKind.Multiplier, null],
    ])('of kind %s must be %s', (kind, requirement) => {
        const stated = kindRequirement(kind);

        expect(stated).toBe(requirement);
    });

    it.each([
        [UsableValues.AnyOfItsKind, 0, true],
        [UsableValues.WholeAboveZero, 1, true],
        [UsableValues.WholeAboveZero, 0, false],
        [UsableValues.WholeAboveZero, 2.5, false],
        [UsableValues.NotZero, -0.5, true],
        [UsableValues.NotZero, 0, false],
    ])('with usable values %s may be %s: %s', (usable, number, isExpected) => {
        const parameterValue = value(number);

        const isUsableValue = isUsable(usable, parameterValue);

        expect(isUsableValue).toBe(isExpected);
    });

    it('states what a usable value must be beyond its kind', () => {
        const any = usableRequirement(UsableValues.AnyOfItsKind);
        const whole = usableRequirement(UsableValues.WholeAboveZero);
        const notZero = usableRequirement(UsableValues.NotZero);

        expect(any).toBeNull();
        expect(whole).toBe('a whole number above 0');
        expect(notZero).toBe('a number other than 0');
    });
});

describe('a valid range', () => {
    it('includes both ends and refuses to end below its start', () => {
        const zeroToTen = range(0, 10);

        const ends = [value(0), value(10)];
        const beyond = value(11);
        const hasEnds = ends.every((end) => zeroToTen.includes(end));
        expect(hasEnds).toBe(true);
        const hasOutside = zeroToTen.includes(beyond);
        expect(hasOutside).toBe(false);
        expect(() => range(10, 0)).toThrow(RangeError);
    });

    it('equals another with the same ends', () => {
        const first = range(0, 10);
        const same = range(0, 10);
        const other = range(0, 11);

        const isSame = first.equals(same);
        const isOther = first.equals(other);
        expect(isSame).toBe(true);
        expect(isOther).toBe(false);
    });
});

describe('a parameter', () => {
    it('says why a run cannot use a value, by its kind and then its usable values', () => {
        const negative = value(-1);
        const part = value(2.5);
        const whole = value(5);

        const ofKind = INTERVAL.refusalOf(negative);
        const notWhole = INTERVAL.refusalOf(part);
        const usable = INTERVAL.refusalOf(whole);

        expect(ofKind).toBe('a number of milliseconds from 0');
        expect(notWhole).toBe('a whole number above 0');
        expect(usable).toBeNull();
    });

    it('refuses a default a run cannot use', () => {
        expect(() =>
            parameter('interval', ParameterKind.Duration, 0, UsableValues.WholeAboveZero),
        ).toThrow('interval must be a whole number above 0, not 0.');
    });

    it('says whether a value is in its valid range', () => {
        const highest = value(1000);
        const beyond = value(1001);

        const isInside = MAX_AGE.isInRange(highest);
        const isOutside = MAX_AGE.isInRange(beyond);

        expect(isInside).toBe(true);
        expect(isOutside).toBe(false);
    });
});

describe('a rule', () => {
    it('finds its parameters by ID', () => {
        const id = toParameterId('max-age');
        const missing = toParameterId('max-distance');

        const found = FRESH.parameter(id);
        const notFound = FRESH.parameter(missing);

        expect(found).toBe(MAX_AGE);
        expect(notFound).toBeUndefined();
    });

    it('refuses two parameters with the same ID', () => {
        expect(() => rule('test.twice', RuleKind.Check, [MAX_AGE, MAX_AGE])).toThrow(RangeError);
    });

    it('refuses to be applied as another kind', () => {
        expect(() => {
            FRESH.assertKind(RuleKind.Check);
        }).not.toThrow();
        expect(() => {
            FRESH.assertKind(RuleKind.Limit);
        }).toThrow(TypeError);
    });
});

describe('a rule set', () => {
    it('starts with each parameter at its default', () => {
        const set = RuleSet.createNew(RULES);

        const entries = set.entries();
        const ids = entries.map((entry) => `${entry.rule.id} ${entry.parameter.id}`).toArray();
        expect(ids).toEqual([
            'test.fresh max-age',
            'test.near max-distance',
            'test.pass interval',
        ]);
        const isAllDefault = entries.every((entry) => entry.isDefault());
        expect(isAllDefault).toBe(true);
    });

    it('changes values by rule and parameter ID, and leaves itself as it was', () => {
        const set = RuleSet.createNew(RULES);
        const changes = List([change('test.fresh', 'max-age', 600)]);

        const changed = set.with(changes);

        const fresh = toRuleId('test.fresh');
        const maxAge = toParameterId('max-age');
        const changedValue = changed.valueOf(fresh, maxAge);
        const unchangedValue = set.valueOf(fresh, maxAge);
        expect(changedValue).toBe(600);
        expect(unchangedValue).toBe(300);
    });

    it.each([
        ['an unknown rule', 'test.unknown', 'max-age', 1, 'There is no rule test.unknown'],
        ['an unknown parameter', 'test.fresh', 'max-distance', 1, 'has no parameter max-distance'],
        ['an unusable value', 'test.pass', 'interval', 0, 'interval must be a whole number'],
    ])('refuses a change to %s', (_case, ruleId, parameterId, number, message) => {
        const set = RuleSet.createNew(RULES);
        const changes = List([change(ruleId, parameterId, number)]);

        expect(() => set.with(changes)).toThrow(message);
    });

    it('uses a value outside its range, and says it is outside', () => {
        const set = RuleSet.createNew(RULES);
        const changes = List([change('test.near', 'max-distance', -500)]);

        const changed = set.with(changes);

        const outside = changed.outOfRange();
        const ids = outside.map((entry) => entry.rule.id).toArray();
        expect(ids).toEqual(['test.near']);
        const first = outside.first()!;
        expect(first.value).toBe(-500);
        const unchanged = set.outOfRange();
        expect(unchanged.size).toBe(0);
    });

    it('refuses two rules with the same ID', () => {
        const twice = List([FRESH, FRESH]);

        expect(() => RuleSet.createNew(twice)).toThrow(RangeError);
    });

    it('refuses values that do not match its rules', () => {
        const set = RuleSet.createNew(RULES);
        const fewer = set.values.remove(PASS.id);
        const freshValues = set.values.get(FRESH.id)!;
        const none = freshValues.clear();
        const empty = set.values.set(PASS.id, none);
        const wrongParameter = set.values.set(PASS.id, freshValues);

        expect(() => RuleSet.create({ rules: RULES, values: fewer })).toThrow(RangeError);
        expect(() => RuleSet.create({ rules: RULES, values: empty })).toThrow(RangeError);
        expect(() => RuleSet.create({ rules: RULES, values: wrongParameter })).toThrow(
            'Missing a value for test.pass interval.',
        );
    });

    it('refuses a value for a parameter the set does not hold', () => {
        const set = RuleSet.createNew(RULES);
        const unknown = toRuleId('test.unknown');
        const maxAge = toParameterId('max-age');

        expect(() => set.valueOf(unknown, maxAge)).toThrow('Missing a value');
    });

    it('is written out for a digest by rule, in order, and equals one with the same values', () => {
        const set = RuleSet.createNew(RULES);
        const same = RuleSet.createNew(RULES);
        const changes = List([change('test.fresh', 'max-age', 600)]);
        const changed = set.with(changes);

        const part = set.digestPart();

        expect(part).toBe('{{10:test.fresh,{n300}},{9:test.near,{n3}},{9:test.pass,{n30}}}');
        const isSame = set.equals(same);
        const isChanged = set.equals(changed);
        expect(isSame).toBe(true);
        expect(isChanged).toBe(false);
        const changedPart = changed.digestPart();
        expect(changedPart).not.toBe(part);
    });
});

interface IFacts {
    readonly ageMs: number;
    readonly distance: number;
}

const valuesOf = (set: RuleSet, ruleOf: Rule, parameterOf: Parameter): number =>
    set.valueOf(ruleOf.id, parameterOf.id);

describe('rules as their module applies them', () => {
    const fresh = Check.create<IFacts, RuleSet>({
        rule: FRESH,
        passes: (facts, set) => facts.ageMs <= valuesOf(set, FRESH, MAX_AGE),
    });
    const near = Check.create<IFacts, RuleSet>({
        rule: NEAR,
        passes: (facts, set) => facts.distance < valuesOf(set, NEAR, MAX_DISTANCE),
    });
    const checks = [fresh, near];
    const set = RuleSet.createNew(RULES);

    it.each([
        [{ ageMs: 100, distance: 1 }, null],
        [{ ageMs: 400, distance: 1 }, 'test.fresh'],
        [{ ageMs: 400, distance: 5 }, 'test.fresh'],
        [{ ageMs: 100, distance: 5 }, 'test.near'],
    ])('gives the first failed check for %o: %s', (facts, expected) => {
        const failed = firstFailed(checks, facts, set);

        expect(failed?.rule.id ?? null).toBe(expected);
    });

    it('calculates a value and tests a limit with the values in use', () => {
        const double = Calculation.create<number, RuleSet, number>({
            rule: rule('test.double', RuleKind.Calculation, []),
            calculates: (input) => input * 2,
        });
        const passLimit = Limit.create<number, RuleSet>({
            rule: PASS,
            allows: (input, values) => input <= valuesOf(values, PASS, INTERVAL),
        });

        const doubled = double.valueFor(21, set);
        const isWithin = passLimit.isWithin(30, set);
        const isBeyond = passLimit.isWithin(31, set);

        expect(doubled).toBe(42);
        expect(isWithin).toBe(true);
        expect(isBeyond).toBe(false);
    });

    it('refuses a rule of another kind', () => {
        expect(() => Limit.create<number, RuleSet>({ rule: FRESH, allows: () => true })).toThrow(
            TypeError,
        );
        expect(() =>
            Calculation.create<number, RuleSet, number>({ rule: FRESH, calculates: () => 0 }),
        ).toThrow(TypeError);
        expect(() => Check.create<number, RuleSet>({ rule: PASS, passes: () => true })).toThrow(
            TypeError,
        );
    });
});
