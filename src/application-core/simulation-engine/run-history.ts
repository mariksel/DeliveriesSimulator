import { OrderedMap } from 'immutable';

import type { Count, Position } from '../../domain/system/math/math';
import { NO_COUNT, toPosition } from '../../domain/system/math/math';
import type { ICommit } from './commit';
import type { CommitId } from './commit-id';
import type { BranchId } from './branch-id';
import { MAIN_BRANCH } from './branch-id';

/**
 * One branch of a run. It shares every commit before its fork with the branch it forked
 * from, and holds only its own commits after that (FND-81, FND-87).
 */
export interface IBranch {
    readonly id: BranchId;
    /** A label a person can change. */
    readonly name: string;
    /** The branch it forked from, or null for Main. */
    readonly forkedFrom: BranchId | null;
    /** How many of that branch's commits it shares: the place it forked at. */
    readonly forkedAt: Position;
    /**
     * Its own commits after the fork, oldest first. The current branch's newest commits are in
     * the run's line of commits, and are kept here when another branch becomes current.
     */
    readonly commits: OrderedMap<CommitId, ICommit>;
}

/** Every branch of a run, and which one is current: the tree on top of the commits. */
export interface IRunHistory {
    readonly branches: OrderedMap<BranchId, IBranch>;
    readonly current: BranchId;
    /** How many forks have been made, which numbers the next one. */
    readonly forksMade: Count;
}

/** The history of a new run: Main alone. */
export const createHistory = (): IRunHistory => ({
    branches: OrderedMap([
        [
            MAIN_BRANCH,
            {
                id: MAIN_BRANCH,
                name: 'Main',
                forkedFrom: null,
                forkedAt: toPosition(0),
                commits: OrderedMap(),
            },
        ],
    ]),
    current: MAIN_BRANCH,
    forksMade: NO_COUNT,
});
