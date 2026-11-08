import { toParameterValue } from '../../domain/business-rules/numbers';
import { toParameterId } from '../../domain/business-rules/parameter';
import { toRuleId } from '../../domain/business-rules/rule';
import { ValueChanged } from '../../domain/business-rules/value-changed';

/** A value a config change changed, persisted. */
export interface IPersistedValueChanged {
    readonly ruleId: string;
    readonly parameterId: string;
    readonly before: number;
    readonly after: number;
}

/** A changed value, persisted. */
export const toPersistedValueChanged = (changed: ValueChanged): IPersistedValueChanged => ({
    ruleId: changed.ruleId,
    parameterId: changed.parameterId,
    before: changed.before,
    after: changed.after,
});

/** A changed value, from its persisted form. */
export function fromPersistedValueChanged(persisted: IPersistedValueChanged): ValueChanged {
    const ruleId = toRuleId(persisted.ruleId);
    const parameterId = toParameterId(persisted.parameterId);
    const before = toParameterValue(persisted.before);
    const after = toParameterValue(persisted.after);
    return ValueChanged.create({ ruleId, parameterId, before, after });
}
