import { toParameterValue } from '../../domain/business-rules/numbers';
import { toParameterId } from '../../domain/business-rules/parameter';
import { ParameterChange } from '../../domain/business-rules/parameter-change';
import { toRuleId } from '../../domain/business-rules/rule';

/** A change to one rule parameter, persisted. */
export interface IPersistedParameterChange {
    readonly ruleId: string;
    readonly parameterId: string;
    readonly value: number;
}

/** A change to one rule parameter, persisted. */
export const toPersistedParameterChange = (
    change: ParameterChange,
): IPersistedParameterChange => ({
    ruleId: change.ruleId,
    parameterId: change.parameterId,
    value: change.value,
});

/** A change to one rule parameter, from its persisted form. */
export function fromPersistedParameterChange(
    persisted: IPersistedParameterChange,
): ParameterChange {
    const ruleId = toRuleId(persisted.ruleId);
    const parameterId = toParameterId(persisted.parameterId);
    const value = toParameterValue(persisted.value);
    return ParameterChange.create({ ruleId, parameterId, value });
}
