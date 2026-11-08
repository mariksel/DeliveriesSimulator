import { ORDERS_RULE_LIST } from '../../domain/orders/orders-rule-definitions';
import { OrdersRules } from '../../domain/orders/orders-rules';
import type { PersistedRuleSet } from '../business-rules/persisted-rule-set';
import { fromPersistedRuleSet, toPersistedRuleSet } from '../business-rules/persisted-rule-set';

/** Orders' rule values in use, as persisted: a rule set's values, by rule and parameter ID. */
export type PersistedOrdersRules = PersistedRuleSet;

/** Orders' rule values in use, persisted. */
export const toPersistedOrdersRules = (rules: OrdersRules): PersistedOrdersRules =>
    toPersistedRuleSet(rules.set);

/** Orders' rules from their persisted values. */
export function fromPersistedOrdersRules(persisted: PersistedOrdersRules): OrdersRules {
    const set = fromPersistedRuleSet(persisted, ORDERS_RULE_LIST);
    return OrdersRules.fromSet(set);
}
