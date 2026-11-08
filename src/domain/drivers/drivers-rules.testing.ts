import type { Parameter } from '../business-rules/parameter';
import { changesOf } from '../business-rules/parameter-change.testing';
import type { Rule } from '../business-rules/rule';
import type { DriversRules } from './drivers-rules';

/** Drivers' rules with one value tuned, for a test. */
export function tunedDriversRules(
    rules: DriversRules,
    rule: Rule,
    parameter: Parameter,
    value: number,
): DriversRules {
    const changes = changesOf(rule, parameter, value);
    return rules.with(changes);
}
