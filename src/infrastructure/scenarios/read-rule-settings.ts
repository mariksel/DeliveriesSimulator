import { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import { toParameterValue } from '../../domain/business-rules/numbers';
import type { ParameterValue } from '../../domain/business-rules/numbers';
import type { Parameter } from '../../domain/business-rules/parameter';
import { ParameterChange } from '../../domain/business-rules/parameter-change';
import { ParameterKind } from '../../domain/business-rules/parameter-kind';
import type { Rule } from '../../domain/business-rules/rule';
import { DELIVERIES_RULE_LIST } from '../../domain/drivers/deliveries/deliveries-rule-definitions';
import { DRIVERS_RULE_LIST } from '../../domain/drivers/drivers-rule-definitions';
import { ORDERS_RULE_LIST } from '../../domain/orders/orders-rule-definitions';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import type { Fields } from './scenario-reader';
import { isFields, readClockTime, readText, unknownFields } from './scenario-reader';

/** Every rule a scenario can set: each module's rules of the version built so far. */
const RULES = DRIVERS_RULE_LIST.concat(ORDERS_RULE_LIST, DELIVERIES_RULE_LIST);

const NONE = List<IScenarioProblem>();

/** What reading a list of rule settings found: the changes, its problems, and its warnings. */
export interface IRuleSettingsReading {
    readonly changes: List<ParameterChange>;
    readonly problems: List<IScenarioProblem>;
    readonly warnings: List<IScenarioProblem>;
}

const NO_SETTINGS: IRuleSettingsReading = { changes: List(), problems: NONE, warnings: NONE };

/** What reading one setting found. */
interface ISettingReading {
    readonly change: ParameterChange | null;
    readonly problems: List<IScenarioProblem>;
    readonly warnings: List<IScenarioProblem>;
}

const failedSetting = (problems: List<IScenarioProblem>): ISettingReading => ({
    change: null,
    problems,
    warnings: NONE,
});

/** A value as the file writes it: a duration in the time notation, anything else a number. */
const written = (parameter: Parameter, value: ParameterValue): string =>
    parameter.kind === ParameterKind.Duration ? formatClockTime(value) : String(value);

/** Reads a setting's value, as its parameter's kind writes it. */
function readValue(fields: Fields, path: string, parameter: Parameter): ISettingReading | number {
    if (parameter.kind === ParameterKind.Duration) {
        const time = readClockTime(fields, path, 'value');
        return time.value ?? failedSetting(time.problems);
    }
    const value = fields['value'];
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const message = value === undefined ? 'is missing' : 'must be a number';
    const problems = problemAt(`${path}value`, message);
    return failedSetting(problems);
}

/** The rule and parameter a setting names, or what is wrong with the names. */
function readTarget(
    fields: Fields,
    path: string,
): { readonly rule: Rule; readonly parameter: Parameter } | List<IScenarioProblem> {
    const ruleText = readText(fields, path, 'rule');
    const parameterText = readText(fields, path, 'parameter');
    if (ruleText.value === null || parameterText.value === null) {
        return ruleText.problems.concat(parameterText.problems);
    }
    const ruleId = ruleText.value;
    const rule = RULES.find((candidate) => candidate.id === ruleId);
    if (rule === undefined) {
        return problemAt(`${path}rule`, `"${ruleId}" is not a rule of this version`);
    }
    const parameterId = parameterText.value;
    const parameter = rule.parameters.find((candidate) => candidate.id === parameterId);
    if (parameter === undefined) {
        return problemAt(`${path}parameter`, `"${parameterId}" is not a parameter of ${rule.id}`);
    }
    return { rule, parameter };
}

/**
 * Reads one setting: a rule, one of its parameters, and a value a run can use. A value outside
 * its valid range is used, with a warning (FND-54, FND-84).
 */
function readSetting(fields: Fields, path: string): ISettingReading {
    const unknown = unknownFields(fields, path, ['rule', 'parameter', 'value']);
    const target = readTarget(fields, path);
    if (List.isList(target)) {
        const problems = unknown.concat(target);
        return failedSetting(problems);
    }
    const { rule, parameter } = target;
    const read = readValue(fields, path, parameter);
    if (typeof read !== 'number') {
        const problems = unknown.concat(read.problems);
        return failedSetting(problems);
    }
    const value = toParameterValue(read);
    const refusal = parameter.refusalOf(value);
    if (refusal !== null) {
        const refused = problemAt(`${path}value`, `must be ${refusal}`);
        const problems = unknown.concat(refused);
        return failedSetting(problems);
    }
    const { lowest, highest } = parameter.range;
    const isInRange = parameter.isInRange(value);
    const warnings = isInRange
        ? NONE
        : problemAt(
              `${path}value`,
              `is outside its valid range, from ${written(parameter, lowest)} to ${written(parameter, highest)}`,
          );
    const change = ParameterChange.create({ ruleId: rule.id, parameterId: parameter.id, value });
    return { change: unknown.isEmpty() ? change : null, problems: unknown, warnings };
}

/**
 * Reads a list of rule settings at a path, such as the top-level `rules` or a step's `set`. An
 * optional list may be left out.
 */
export function readRuleSettings(
    fields: Fields,
    path: string,
    key: string,
    isRequired: boolean,
): IRuleSettingsReading {
    const value = fields[key];
    if (value === undefined && !isRequired) {
        return NO_SETTINGS;
    }
    if (!Array.isArray(value)) {
        const message = value === undefined ? 'is missing' : 'must be a list';
        return { ...NO_SETTINGS, problems: problemAt(`${path}${key}`, message) };
    }
    const items = List<unknown>(value);
    return items.reduce<IRuleSettingsReading>((soFar, item, index) => {
        const itemPath = `${path}${key}[${index}]`;
        if (!isFields(item)) {
            const problems = problemAt(itemPath, 'must have fields');
            return { ...soFar, problems: soFar.problems.concat(problems) };
        }
        const setting = readSetting(item, `${itemPath}.`);
        return {
            changes: setting.change === null ? soFar.changes : soFar.changes.push(setting.change),
            problems: soFar.problems.concat(setting.problems),
            warnings: soFar.warnings.concat(setting.warnings),
        };
    }, NO_SETTINGS);
}
