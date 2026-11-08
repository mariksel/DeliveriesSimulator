import type { ScenarioResult } from './scenario';

/** A file someone chose. Only the layer that reads files knows what else it is. */
export interface IChosenFile {
    readonly name: string;
}

/**
 * Reads the scenario files someone chooses. Reading and parsing a file is outside the core, so the
 * core sees only the scenario it holds, or what is wrong with it.
 */
export abstract class ScenarioFiles {
    /** The scenario in the file, or its problems, including a file that cannot be read. */
    abstract readScenario(file: IChosenFile): Promise<ScenarioResult>;
}
