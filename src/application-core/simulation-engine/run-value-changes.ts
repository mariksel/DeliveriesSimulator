import type { List } from 'immutable';

import type { ParameterChange } from '../../domain/business-rules/parameter-change';
import type { RuleSet } from '../../domain/business-rules/rule-set';
import { ValueChanged } from '../../domain/business-rules/value-changed';
import type { IRunValues } from './run-values';

/** The config values after some changes, and each value they changed, in the changes' order. */
export interface IChangedValues {
    readonly values: IRunValues;
    readonly changed: List<ValueChanged>;
}

const holds = (set: RuleSet, change: ParameterChange): boolean =>
    set.rules.some((rule) => rule.id === change.ruleId);

/** Refuses a change to a rule that no module holds. */
function assertOwned(values: IRunValues, change: ParameterChange): void {
    const isOwned =
        holds(values.drivers.set, change) ||
        holds(values.orders.set, change) ||
        holds(values.deliveries.set, change);
    if (!isOwned) {
        throw new RangeError(`No module has a rule ${change.ruleId}.`);
    }
}

/** The set of the module that holds a change's rule, which must be one of them. */
function setOf(values: IRunValues, change: ParameterChange): RuleSet {
    if (holds(values.drivers.set, change)) {
        return values.drivers.set;
    }
    if (holds(values.orders.set, change)) {
        return values.orders.set;
    }
    return values.deliveries.set;
}

/**
 * The config values with parameters changed by rule ID, each sent to the module that holds the
 * rule; a module with no changes keeps its rules as they were. Each module's rules check their
 * changes, so an unknown parameter or a value a run cannot use is refused; one outside its valid
 * range is used (FND-54, FND-84).
 */
export function changedValues(values: IRunValues, changes: List<ParameterChange>): IChangedValues {
    changes.forEach((change) => {
        assertOwned(values, change);
    });
    const forDrivers = changes.filter((change) => holds(values.drivers.set, change));
    const forOrders = changes.filter((change) => holds(values.orders.set, change));
    const forDeliveries = changes.filter((change) => holds(values.deliveries.set, change));
    const changedValuesInUse: IRunValues = {
        drivers: forDrivers.isEmpty() ? values.drivers : values.drivers.with(forDrivers),
        orders: forOrders.isEmpty() ? values.orders : values.orders.with(forOrders),
        deliveries: forDeliveries.isEmpty()
            ? values.deliveries
            : values.deliveries.with(forDeliveries),
    };
    const changed = changes.map((change) => {
        const set = setOf(values, change);
        const before = set.valueOf(change.ruleId, change.parameterId);
        return ValueChanged.create({
            ruleId: change.ruleId,
            parameterId: change.parameterId,
            before,
            after: change.value,
        });
    });
    return { values: changedValuesInUse, changed };
}
