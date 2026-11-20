import { List } from 'immutable';

import type { IScenarioProblem } from '../../application-core/scenarios/scenario';
import { problemAt } from '../../application-core/scenarios/scenario';
import type { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import { isFunctionName } from '../../application-core/simulation-engine/function-name';
import type { IFunctionUse } from '../../application-core/simulation-engine/run-input';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import type { Fields, IReading } from './scenario-reader';
import { isFields, readText, unknownFields } from './scenario-reader';

const NONE = List<IScenarioProblem>();

/** One function and version a `use` step names, read, and what is wrong with it. */
function readUse(entry: unknown, at: string, functions: FunctionLookup): IReading<IFunctionUse> {
    if (!isFields(entry)) {
        return { value: null, problems: problemAt(at, 'must have fields') };
    }
    const path = `${at}.`;
    const unknown = unknownFields(entry, path, ['function', 'version']);
    const name = readText(entry, path, 'function');
    const version = entry['version'];
    const isWhole = typeof version === 'number' && Number.isInteger(version) && version >= 1;
    const versionProblems = isWhole
        ? NONE
        : problemAt(`${path}version`, 'must be a whole number from 1');
    if (name.value === null || !isFunctionName(name.value)) {
        const named =
            name.value === null
                ? NONE
                : problemAt(`${path}function`, `"${name.value}" is not a state function`);
        return { value: null, problems: unknown.concat(name.problems, named, versionProblems) };
    }
    if (!isWhole) {
        return { value: null, problems: unknown.concat(versionProblems) };
    }
    const number = toVersionNumber(version);
    const versions = functions.versionsOf(name.value);
    if (!versions.includes(number)) {
        const message = `${name.value} has no version ${version}`;
        const missing = problemAt(`${path}version`, message);
        return { value: null, problems: unknown.concat(missing) };
    }
    return { value: { function: name.value, version: number }, problems: unknown };
}

/**
 * Reads the functions a `use` step switches, each by name and version, which the run's lookup
 * must hold, so a scenario cannot name a function or a version that does not exist (FND-81).
 */
export function readFunctionUses(
    step: Fields,
    path: string,
    functions: FunctionLookup,
): IReading<List<IFunctionUse>> {
    const listed = step['use'];
    if (!Array.isArray(listed) || listed.length === 0) {
        return {
            value: null,
            problems: problemAt(`${path}use`, 'must list at least one function and its version'),
        };
    }
    const entries = List<unknown>(listed);
    const readings = entries.map((entry, index) =>
        readUse(entry, `${path}use[${index}]`, functions),
    );
    const problems = readings.flatMap((reading) => reading.problems);
    const uses = readings.flatMap((reading) => (reading.value === null ? [] : [reading.value]));
    return problems.isEmpty() ? { value: uses, problems } : { value: null, problems };
}
