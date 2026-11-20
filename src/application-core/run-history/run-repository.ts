import type { BranchId } from '../simulation-engine/branch-id';
import type { IRunState } from '../simulation-engine/run-state';
import type {
    ILoadProgress,
    ISaveRequest,
    ISavedRun,
    RunLevel,
    SaveOutcome,
    SavedRunId,
} from './saved-run';

/**
 * Owns what is stored of runs. It maps every record to a persisted record of its own and each
 * function to its stored ID, so application records are never stored directly and functions can
 * be renamed. Infrastructure implements it, in browser storage, so every call is asynchronous;
 * a run comes back carrying the lookup of state functions the repository was given (FND-81).
 */
export abstract class RunRepository {
    /**
     * Saves a run at a level, under its own new ID, or stores nothing and says why, such as
     * browser storage being full.
     */
    abstract save(request: ISaveRequest): Promise<SaveOutcome>;

    /**
     * The saved run with an ID, or undefined when there is none. It is restored in chunks of
     * commits, telling its progress after each, as a run saved at "minimum" has every root worked
     * out again, which may take about as long as running it.
     */
    abstract load(
        id: SavedRunId,
        onProgress?: (progress: ILoadProgress) => void,
    ): Promise<IRunState | undefined>;

    /**
     * Moves a saved run to another level, keeping its ID: down drops each commit's change for its
     * digest, and up works every root out again, telling its progress, and saves each change. A
     * run that no longer fits keeps its old level and says why; undefined when there is none.
     */
    abstract moveTo(
        id: SavedRunId,
        level: RunLevel,
        onProgress?: (progress: ILoadProgress) => void,
    ): Promise<SaveOutcome | undefined>;

    /**
     * Deletes a branch with no forks of its own, never Main, from a saved run, rewriting it under
     * its ID and leaving the rest as it was saved (FND-81). A saved run without the branch is left
     * as it is; undefined when there is no such saved run.
     */
    abstract deleteBranch(id: SavedRunId, branch: BranchId): Promise<SaveOutcome | undefined>;

    /** What is told of every saved run, without loading any, oldest first. */
    abstract list(): Promise<readonly ISavedRun[]>;

    /** What is told of one saved run, or undefined when there is none. */
    abstract find(id: SavedRunId): Promise<ISavedRun | undefined>;

    /** Deletes a saved run; deleting one that is not there does nothing. */
    abstract delete(id: SavedRunId): Promise<void>;
}
