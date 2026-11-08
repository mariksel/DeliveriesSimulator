import type { IRunState } from '../simulation-engine/run-state';

/**
 * Owns what is stored of runs. It maps every record to a persisted record of its own and each
 * function to its stored ID, so application records are never stored directly and functions can
 * be renamed. Infrastructure implements it.
 */
export abstract class RunRepository {
    /** Keeps a run under a name, replacing any run kept under it before. */
    abstract save(name: string, run: IRunState): void;

    /** The run kept under a name, or undefined when there is none. */
    abstract load(name: string): IRunState | undefined;
}
