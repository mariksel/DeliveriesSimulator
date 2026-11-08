import type { List } from 'immutable';
import { OrderedMap } from 'immutable';

import { toParameterValue } from '../../domain/business-rules/numbers';
import type { ParameterValue } from '../../domain/business-rules/numbers';
import type { ParameterId } from '../../domain/business-rules/parameter';
import { toParameterId } from '../../domain/business-rules/parameter';
import type { Rule, RuleId } from '../../domain/business-rules/rule';
import { toRuleId } from '../../domain/business-rules/rule';
import { RuleSet } from '../../domain/business-rules/rule-set';

/** One parameter's value in use, persisted. */
export interface IPersistedParameterValue {
    readonly id: string;
    readonly value: number;
}

/** One rule's values in use, persisted in its parameters' order. */
export interface IPersistedRuleValues {
    readonly id: string;
    readonly values: readonly IPersistedParameterValue[];
}

/** A rule set's values in use, persisted in its rules' order. Its rules are in the code. */
export type PersistedRuleSet = readonly IPersistedRuleValues[];

/** A rule set's values in use, persisted. */
export const toPersistedRuleSet = (set: RuleSet): PersistedRuleSet =>
    set.values
        .entrySeq()
        .map(([id, values]): IPersistedRuleValues => {
            const parameters = values
                .entrySeq()
                .map(([parameterId, value]) => ({ id: parameterId, value }))
                .toArray();
            return { id, values: parameters };
        })
        .toArray();

function fromPersistedRuleValues(
    rule: IPersistedRuleValues,
): [RuleId, OrderedMap<ParameterId, ParameterValue>] {
    const id = toRuleId(rule.id);
    const pairs = rule.values.map((parameter): [ParameterId, ParameterValue] => {
        const parameterId = toParameterId(parameter.id);
        const value = toParameterValue(parameter.value);
        return [parameterId, value];
    });
    const values = OrderedMap(pairs);
    return [id, values];
}

/**
 * A rule set from its persisted values and the module's rules, which checks each value as a
 * rule set does.
 */
export function fromPersistedRuleSet(persisted: PersistedRuleSet, rules: List<Rule>): RuleSet {
    const pairs = persisted.map(fromPersistedRuleValues);
    const values = OrderedMap(pairs);
    return RuleSet.create({ rules, values });
}
