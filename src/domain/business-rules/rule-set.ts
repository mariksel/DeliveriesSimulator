import type { List } from 'immutable';
import { is, OrderedMap } from 'immutable';

import type { DigestField } from '../system/digests/digest-parts';
import { recordPart } from '../system/digests/digest-parts';
import type { FieldsOf } from '../system/classes/fields-of';
import { required } from '../system/validation/required';
import type { ParameterValue } from './numbers';
import type { ParameterId } from './parameter';
import type { ParameterChange } from './parameter-change';
import type { Rule, RuleId } from './rule';
import { RuleValue } from './rule-value';

/** Each rule's values in use, by rule ID and then parameter ID. */
export type RuleValues = OrderedMap<RuleId, OrderedMap<ParameterId, ParameterValue>>;

function assertDistinctRules(rules: List<Rule>): void {
    const ids = rules.map((rule) => rule.id);
    const distinct = ids.toSet();
    if (distinct.size !== ids.size) {
        throw new RangeError('A rule set has two rules with the same ID.');
    }
}

/** Refuses a rule's values unless there is one usable value for each of its parameters. */
function assertRuleValues(
    rule: Rule,
    values: OrderedMap<ParameterId, ParameterValue> | undefined,
): void {
    if (values?.size !== rule.parameters.size) {
        throw new RangeError(`Rule ${rule.id} needs one value for each of its parameters.`);
    }
    rule.parameters.forEach((parameter) => {
        const value = values.get(parameter.id);
        const known = required(value, `a value for ${rule.id} ${parameter.id}`);
        parameter.assertUsable(known);
    });
}

function defaultValues(rule: Rule): OrderedMap<ParameterId, ParameterValue> {
    const pairs = rule.parameters.map((parameter): [ParameterId, ParameterValue] => [
        parameter.id,
        parameter.defaultValue,
    ]);
    return OrderedMap(pairs);
}

function valuesPart(values: OrderedMap<ParameterId, ParameterValue>): string {
    const fields = values
        .toList()
        .map((value): DigestField => ({ number: value }))
        .toArray();
    return recordPart(fields);
}

/**
 * A module's rules in order, with the values in use. It refuses only what a run cannot use, and
 * says which values are outside their valid range (FND-54, FND-84).
 */
export class RuleSet {
    /** The rules with their defaults: the values the version's rules state. */
    static createNew(rules: List<Rule>): RuleSet {
        const pairs = rules.map((rule): [RuleId, OrderedMap<ParameterId, ParameterValue>] => [
            rule.id,
            defaultValues(rule),
        ]);
        const values = OrderedMap(pairs);
        return RuleSet.create({ rules, values });
    }

    /**
     * A rule set. Its rules must have distinct IDs, and its values must hold one usable value for
     * each parameter of each rule, and nothing else.
     */
    static create(fields: FieldsOf<RuleSet>): RuleSet {
        assertDistinctRules(fields.rules);
        if (fields.values.size !== fields.rules.size) {
            throw new RangeError('A rule set holds values only for its own rules.');
        }
        fields.rules.forEach((rule) => {
            const values = fields.values.get(rule.id);
            assertRuleValues(rule, values);
        });
        return new RuleSet(fields.rules, fields.values);
    }

    declare private readonly brand: never;

    private constructor(
        /** The rules, in the order their module applies and lists them. */
        readonly rules: List<Rule>,
        readonly values: RuleValues,
    ) {
        Object.freeze(this);
    }

    /** The value in use for a rule's parameter. Both must be in the set. */
    valueOf(ruleId: RuleId, parameterId: ParameterId): ParameterValue {
        const ruleValues = this.values.get(ruleId);
        const value = ruleValues?.get(parameterId);
        return required(value, `a value for ${ruleId} ${parameterId}`);
    }

    /**
     * These rules with some values changed. Each change must name a rule and parameter in the set,
     * and a value a run can use; one outside its valid range is allowed.
     */
    with(changes: List<ParameterChange>): RuleSet {
        const values = changes.reduce((current, change) => {
            this.assertKnown(change);
            const held = current.get(change.ruleId);
            const ruleValues = required(held, `rule ${change.ruleId}`);
            const changed = ruleValues.set(change.parameterId, change.value);
            return current.set(change.ruleId, changed);
        }, this.values);
        return RuleSet.create({ rules: this.rules, values });
    }

    /** Every rule's parameters with their values in use, in the rules' order. */
    entries(): List<RuleValue> {
        return this.rules.flatMap((rule) =>
            rule.parameters.map((parameter) => {
                const value = this.valueOf(rule.id, parameter.id);
                return RuleValue.create({ rule, parameter, value });
            }),
        );
    }

    /** The values outside their valid range, which a run uses but warns about. */
    outOfRange(): List<RuleValue> {
        const entries = this.entries();
        return entries.filter((entry) => !entry.isInRange());
    }

    /** The values, written out rule by rule for a digest. */
    digestPart(): string {
        const fields = this.rules
            .map((rule): DigestField => {
                const held = this.values.get(rule.id);
                const values = required(held, `rule ${rule.id}`);
                const part = valuesPart(values);
                const ruleFields: readonly DigestField[] = [{ text: rule.id }, { part }];
                const rulePart = recordPart(ruleFields);
                return { part: rulePart };
            })
            .toArray();
        return recordPart(fields);
    }

    /** Whether another rule set holds the same rules with the same values. */
    equals(other: RuleSet): boolean {
        const ids = this.rules.map((rule) => rule.id);
        const otherIds = other.rules.map((rule) => rule.id);
        return is(ids, otherIds) && is(this.values, other.values);
    }

    private assertKnown(change: ParameterChange): void {
        const rule = this.rules.find((candidate) => candidate.id === change.ruleId);
        if (rule === undefined) {
            throw new RangeError(`There is no rule ${change.ruleId} in this rule set.`);
        }
        const parameter = rule.parameter(change.parameterId);
        if (parameter === undefined) {
            throw new RangeError(`Rule ${rule.id} has no parameter ${change.parameterId}.`);
        }
    }
}
