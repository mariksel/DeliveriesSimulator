import type { Parameter } from '../business-rules/parameter';
import { changesOf } from '../business-rules/parameter-change.testing';
import type { Rule } from '../business-rules/rule';
import type { OrdersRules } from './orders-rules';

/** Orders' rules with one value tuned, for a test. */
export function tunedOrdersRules(
    rules: OrdersRules,
    rule: Rule,
    parameter: Parameter,
    value: number,
): OrdersRules {
    const changes = changesOf(rule, parameter, value);
    return rules.with(changes);
}
