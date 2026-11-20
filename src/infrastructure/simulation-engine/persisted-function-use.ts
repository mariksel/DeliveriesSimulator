import { isFunctionName } from '../../application-core/simulation-engine/function-name';
import type { IFunctionUse } from '../../application-core/simulation-engine/run-input';
import { toVersionNumber } from '../../domain/system/records/version-chain';

/** A state function to use, persisted by its name and its version (FND-81). */
export interface IPersistedFunctionUse {
    readonly function: string;
    readonly version: number;
}

/** A state function to use, persisted. */
export const toPersistedFunctionUse = (use: IFunctionUse): IPersistedFunctionUse => ({
    function: use.function,
    version: use.version,
});

/** A state function to use, from its persisted form, refusing a name no function has. */
export function fromPersistedFunctionUse(use: IPersistedFunctionUse): IFunctionUse {
    if (!isFunctionName(use.function)) {
        throw new Error(`No state function is named ${use.function}.`);
    }
    const version = toVersionNumber(use.version);
    return { function: use.function, version };
}
