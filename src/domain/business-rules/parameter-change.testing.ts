import { List } from 'immutable';

import { toParameterValue } from './numbers';
import type { Parameter } from './parameter';
import { ParameterChange } from './parameter-change';
import type { Rule } from './rule';

/** One change to a rule's parameter, as a list a rule set takes, for a test. */
export function changesOf(rule: Rule, parameter: Parameter, value: number): List<ParameterChange> {
    const parameterValue = toParameterValue(value);
    const change = ParameterChange.create({
        ruleId: rule.id,
        parameterId: parameter.id,
        value: parameterValue,
    });
    return List([change]);
}
