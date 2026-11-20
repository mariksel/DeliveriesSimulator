import { Map as ImmutableMap } from 'immutable';
import type { FunctionVersions } from '../../application-core/simulation-engine/function-lookup';
import type { FunctionName } from '../../application-core/simulation-engine/function-name';
import { FUNCTION_NAMES } from '../../application-core/simulation-engine/function-name';
import type { VersionNumber } from '../../domain/system/records/version-chain';
import type { IRunValues } from '../../application-core/simulation-engine/run-values';
import { toParameterValue } from '../../domain/business-rules/numbers';
import type { ParameterValue } from '../../domain/business-rules/numbers';
import type { Parameter, ParameterId } from '../../domain/business-rules/parameter';
import { ParameterChange } from '../../domain/business-rules/parameter-change';
import { ParameterKind } from '../../domain/business-rules/parameter-kind';
import type { RuleId } from '../../domain/business-rules/rule';
import type { RuleSet } from '../../domain/business-rules/rule-set';
import type { RuleValue } from '../../domain/business-rules/rule-value';
import { unreachable } from '../../domain/system/validation/unreachable';
import { formatClockTime, parseClockTime } from '../../domain/simulation-engine/clock-time';

/** One parameter of a rule, as the Rules panel shows it. */
export interface IParameterView {
    readonly ruleId: RuleId;
    readonly parameterId: ParameterId;
    /** The parameter's place, unique in the panel: its rule's ID and its own. */
    readonly key: string;
    readonly name: string;
    readonly text: string;
    /** What its value measures, and how a person writes one. */
    readonly kind: string;
    readonly value: string;
    readonly defaultValue: string;
    readonly range: string;
    readonly isOutOfRange: boolean;
    readonly isDefault: boolean;
}

/** One rule, as the Rules panel shows it. */
export interface IRuleView {
    readonly id: RuleId;
    readonly name: string;
    readonly text: string;
    readonly source: string;
    readonly kind: string;
    readonly parameters: readonly IParameterView[];
}

/** One module's rules, in the order the module applies them. */
export interface IModuleRulesView {
    readonly name: string;
    readonly rules: readonly IRuleView[];
    /** The module's state functions, each with the version in use and the others (FND-81). */
    readonly functions: readonly IFunctionView[];
}

/** A person's new value for a parameter, as they typed it. */
export interface IRuleEdit {
    readonly ruleId: RuleId;
    readonly parameterId: ParameterId;
    readonly text: string;
    /** The label of the scenario's indirect effect the change follows from, if one is picked. */
    readonly after?: string;
}

/** Why a person's new value was not used, shown beside the parameter they changed. */
export interface IRuleEditProblem {
    readonly key: string;
    readonly message: string;
}

/** What a typed value comes to: a change to make, or why it cannot be made. */
export type RuleEditResult =
    | { readonly isOk: true; readonly change: ParameterChange }
    | { readonly isOk: false; readonly problem: IRuleEditProblem };

/** A parameter's place in the panel. */
export const parameterKey = (ruleId: RuleId, parameterId: ParameterId): string =>
    `${ruleId} ${parameterId}`;

/** How a person writes a value of this kind, as a scenario file does (FND-84). */
function kindLabel(kind: ParameterKind): string {
    switch (kind) {
        case ParameterKind.Duration:
            return 'Duration, as h00:m00:s00:ms00';
        case ParameterKind.Distance:
            return 'Distance, in metres';
        case ParameterKind.Count:
            return 'Count';
        case ParameterKind.Multiplier:
            return 'Multiplier';
        default:
            return unreachable(kind);
    }
}

/** A value as the panel writes it: a duration in the time notation, anything else a number. */
export const valueText = (parameter: Parameter, value: ParameterValue): string =>
    parameter.kind === ParameterKind.Duration ? formatClockTime(value) : String(value);

function parameterView(entry: RuleValue): IParameterView {
    const { rule, parameter, value } = entry;
    const lowest = valueText(parameter, parameter.range.lowest);
    const highest = valueText(parameter, parameter.range.highest);
    const isInRange = entry.isInRange();
    return {
        ruleId: rule.id,
        parameterId: parameter.id,
        key: parameterKey(rule.id, parameter.id),
        name: parameter.name,
        text: parameter.text,
        kind: kindLabel(parameter.kind),
        value: valueText(parameter, value),
        defaultValue: valueText(parameter, parameter.defaultValue),
        range: `${lowest} to ${highest}`,
        isOutOfRange: !isInRange,
        isDefault: entry.isDefault(),
    };
}

function moduleView(name: string, set: RuleSet): Omit<IModuleRulesView, 'functions'> {
    const entries = set.entries();
    const rules = set.rules
        .map((rule): IRuleView => ({
            id: rule.id,
            name: rule.name,
            text: rule.text,
            source: rule.source,
            kind: rule.kind,
            parameters: entries
                .filter((entry) => entry.rule.id === rule.id)
                .map(parameterView)
                .toArray(),
        }))
        .toArray();
    return { name, rules };
}

/** One state function as the Rules panel lists it: its name, and its versions (FND-81). */
export interface IFunctionView {
    readonly name: FunctionName;
    /** Its name in words, such as "Pick up". */
    readonly label: string;
    readonly inUse: VersionNumber;
    /** Every version the run's lookup holds, oldest first. */
    readonly versions: readonly VersionNumber[];
}

/** A person's choice of a version for a function in the Rules panel (FND-81). */
export interface IFunctionChoice {
    readonly function: FunctionName;
    readonly version: VersionNumber;
    /** The indirect effect's label the switch follows from, if any (FND-89). */
    readonly after?: string;
}

/** What the Rules panel needs to list the functions: the versions in use, and every version. */
export interface IFunctionsInUse {
    readonly functionVersions: FunctionVersions;
    readonly versionsOfFunction: (name: FunctionName) => readonly VersionNumber[];
}

/** Which module's section a function sits in, by its name. */
const moduleOfFunction = (name: FunctionName): string =>
    name.startsWith('orders.') ? 'Orders' : 'Deliveries';

/** A function's name in words, from its last part: "orders.pick-up" is "Pick up". */
function functionLabel(name: FunctionName): string {
    const last = name.split('.').at(-1) ?? name;
    const words = last.replaceAll('-', ' ');
    return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** The functions of one module, each with its versions, in the order the names list them. */
function functionsOf(module: string, functions: IFunctionsInUse): readonly IFunctionView[] {
    return FUNCTION_NAMES.filter((name) => moduleOfFunction(name) === module).flatMap((name) => {
        const inUse = functions.functionVersions.get(name);
        const versions = functions.versionsOfFunction(name);
        const label = functionLabel(name);
        return inUse === undefined ? [] : [{ name, label, inUse, versions }];
    });
}

const NO_FUNCTIONS: IFunctionsInUse = {
    functionVersions: ImmutableMap(),
    versionsOfFunction: () => [],
};

/**
 * Every module's rules with the values in use, and its state functions with their versions, as
 * the Rules panel lists them.
 */
export function rulesPanelView(
    values: IRunValues,
    functions: IFunctionsInUse = NO_FUNCTIONS,
): readonly IModuleRulesView[] {
    const orders = moduleView('Orders', values.orders.set);
    const drivers = moduleView('Drivers', values.drivers.set);
    const deliveries = moduleView('Deliveries', values.deliveries.set);
    return [orders, drivers, deliveries].map((module) => ({
        ...module,
        functions: functionsOf(module.name, functions),
    }));
}

function parameterOf(values: IRunValues, edit: IRuleEdit): Parameter | undefined {
    const sets = [values.orders.set, values.drivers.set, values.deliveries.set];
    const rule = sets
        .flatMap((set) => set.rules.toArray())
        .find((candidate) => candidate.id === edit.ruleId);
    return rule?.parameter(edit.parameterId);
}

/** A typed value as its parameter's kind writes it, or null when it is not written that way. */
function typedValue(parameter: Parameter, text: string): number | null {
    const trimmed = text.trim();
    if (parameter.kind === ParameterKind.Duration) {
        return parseClockTime(trimmed);
    }
    const number = trimmed === '' ? Number.NaN : Number(trimmed);
    return Number.isFinite(number) ? number : null;
}

/**
 * What a typed value comes to: a change, or why it cannot be made. A value outside its valid
 * range is a change, which the panel then marks (FND-54).
 */
export function ruleEditResult(values: IRunValues, edit: IRuleEdit): RuleEditResult {
    const key = parameterKey(edit.ruleId, edit.parameterId);
    const parameter = parameterOf(values, edit);
    if (parameter === undefined) {
        return { isOk: false, problem: { key, message: 'This rule has no such parameter.' } };
    }
    const typed = typedValue(parameter, edit.text);
    if (typed === null) {
        const message =
            parameter.kind === ParameterKind.Duration
                ? 'Write a duration as a time, such as h00:m00:s30:ms00.'
                : 'Write a number, such as 2.5.';
        return { isOk: false, problem: { key, message } };
    }
    const value = toParameterValue(typed);
    const refusal = parameter.refusalOf(value);
    if (refusal !== null) {
        return { isOk: false, problem: { key, message: `The value must be ${refusal}.` } };
    }
    const change = ParameterChange.create({
        ruleId: edit.ruleId,
        parameterId: edit.parameterId,
        value,
    });
    return { isOk: true, change };
}
