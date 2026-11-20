import { Map as ImmutableMap } from 'immutable';

import type { VersionNumber } from '../../domain/system/records/version-chain';
import { required } from '../../domain/system/validation/required';
import type { FunctionName, IStateFunctions } from './function-name';
import { FUNCTION_NAMES } from './function-name';

/**
 * Finds a state function by its name and version, and lists each function's versions, newest
 * last (FND-81). Application.Core declares it, as it may not import Infrastructure, and the
 * repository implements it from its registry. A run carries it, beside its cache, never saved.
 */
export abstract class FunctionLookup {
    /** The function a name and a version stand for; a version not registered is a bug. */
    abstract functionOf<TName extends FunctionName>(
        name: TName,
        version: VersionNumber,
    ): IStateFunctions[TName];

    /** Every version registered for a function, oldest first: the highest is the newest. */
    abstract versionsOf(name: FunctionName): readonly VersionNumber[];
}

/** The version of each function a run uses, by name, which its root's direct part holds. */
export type FunctionVersions = ImmutableMap<FunctionName, VersionNumber>;

/** The newest version of every function, which a run starts with (FND-81). */
export function newestVersions(lookup: FunctionLookup): FunctionVersions {
    const pairs = FUNCTION_NAMES.map((name) => {
        const versions = lookup.versionsOf(name);
        const last = versions.at(-1);
        const newest = required(last, `a version of ${name}`);
        return [name, newest] as const;
    });
    return ImmutableMap(pairs);
}

/** What picking a function needs of a run: the lookup it carries, and the versions it uses. */
export interface IFunctionsInUse {
    readonly functions: FunctionLookup;
    readonly root: {
        readonly effects: { readonly direct: { readonly functionVersions: FunctionVersions } };
    };
}

/** The version of a function a run uses, through which every state call goes (FND-81). */
export function functionInUse<TName extends FunctionName>(
    run: IFunctionsInUse,
    name: TName,
): IStateFunctions[TName] {
    const found = run.root.effects.direct.functionVersions.get(name);
    const version = required(found, `the version of ${name} in use`);
    return run.functions.functionOf(name, version);
}
