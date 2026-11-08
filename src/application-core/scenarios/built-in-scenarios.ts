import type { List } from 'immutable';

import type { ScenarioResult } from './scenario';

/** A scenario the simulator ships with. */
export type BuiltInScenarioId = string & { readonly brand: 'BuiltInScenarioId' };
/** Marks text as a built-in scenario's ID. */
export const toBuiltInScenarioId = (value: string): BuiltInScenarioId =>
    value as BuiltInScenarioId;

/** A scenario the simulator ships with, as a list of them shows it. */
export interface IBuiltInScenario {
    readonly id: BuiltInScenarioId;
    readonly name: string;
}

/**
 * The scenarios the simulator ships with. They are scenario files, so reading them is outside the
 * core, as reading a chosen file is.
 */
export abstract class BuiltInScenarios {
    /** Every built-in scenario, in the library's order. */
    abstract list(): List<IBuiltInScenario>;

    /** The built-in scenario with this ID, or what is wrong: no such scenario, or a bad file. */
    abstract scenario(id: BuiltInScenarioId): ScenarioResult;
}
