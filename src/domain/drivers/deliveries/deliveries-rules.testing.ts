import type { Parameter } from '../../business-rules/parameter';
import { changesOf } from '../../business-rules/parameter-change.testing';
import type { Rule } from '../../business-rules/rule';
import type { DeliveriesRules } from './deliveries-rules';

/** Deliveries' rules with one value tuned, for a test. */
export function tunedDeliveriesRules(
    rules: DeliveriesRules,
    rule: Rule,
    parameter: Parameter,
    value: number,
): DeliveriesRules {
    const changes = changesOf(rule, parameter, value);
    return rules.with(changes);
}
