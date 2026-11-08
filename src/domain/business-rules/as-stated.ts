import { List } from 'immutable';

import { toParameterValue } from './numbers';
import { Parameter, toParameterId } from './parameter';
import type { ParameterKind } from './parameter-kind';
import { Rule, toRuleId } from './rule';
import type { RuleKind } from './rule-kind';
import { UsableValues } from './usable-values';
import { ValidRange } from './valid-range';

/** A parameter as a module states it, before its ID and numbers are checked. */
export interface IParameterAsStated {
    readonly id: string;
    readonly name: string;
    readonly text: string;
    readonly kind: ParameterKind;
    /** Any value of its kind, unless stated. */
    readonly usable?: UsableValues;
    readonly defaultValue: number;
    readonly lowest: number;
    readonly highest: number;
}

/** A parameter, from what its module states. */
export function statedParameter(stated: IParameterAsStated): Parameter {
    const id = toParameterId(stated.id);
    const defaultValue = toParameterValue(stated.defaultValue);
    const lowest = toParameterValue(stated.lowest);
    const highest = toParameterValue(stated.highest);
    const range = ValidRange.create({ lowest, highest });
    return Parameter.create({
        id,
        name: stated.name,
        text: stated.text,
        kind: stated.kind,
        usable: stated.usable ?? UsableValues.AnyOfItsKind,
        defaultValue,
        range,
    });
}

/** A rule as a module states it, before its ID is checked. */
export interface IRuleAsStated {
    readonly id: string;
    readonly name: string;
    readonly text: string;
    readonly source: string;
    readonly kind: RuleKind;
    readonly parameters: readonly Parameter[];
}

/** A rule, from what its module states. */
export function statedRule(stated: IRuleAsStated): Rule {
    const id = toRuleId(stated.id);
    const parameters = List(stated.parameters);
    return Rule.create({
        id,
        name: stated.name,
        text: stated.text,
        source: stated.source,
        kind: stated.kind,
        parameters,
    });
}
