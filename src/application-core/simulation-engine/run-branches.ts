import type { OrderedMap } from 'immutable';
import { List, Set as ImmutableSet } from 'immutable';

import type { Position } from '../../domain/system/math/math';
import { plusOne, toCount } from '../../domain/system/math/math';
import { required } from '../../domain/system/validation/required';
import type { ICommit } from './commit';
import type { CommitId } from './commit-id';
import { rebuildRunCache } from './run-cache';
import type { IRunHistory, IBranch } from './run-history';
import type { RunLogEntry } from './run-log-entry';
import { groupStartAtOrBefore } from './run-places';
import type { IRunState } from './run-state';
import type { ICommitLine } from './commit-line';
import type { IMainRoot } from './main-root';
import type { BranchId } from './branch-id';
import { toBranchId } from './branch-id';
import type { IRunIndex } from './run-index';

/**
 * Forking, switching, and naming a run's branches (FND-81, FND-87). The engine works on the
 * current branch's line of commits, as before; the history keeps every other branch's own
 * commits, and every branch shares the commits before its fork.
 */

/**
 * A branch with its whole line of commits, oldest first, the shared ones included: what the
 * timeline draws a branch's column from (FND-87).
 */
export interface IBranchLine {
    readonly id: BranchId;
    readonly name: string;
    readonly forkedFrom: BranchId | null;
    /** How many commits of its parent's line it shares. */
    readonly forkedAt: Position;
    readonly isCurrent: boolean;
    /** The root the run started from, before its first commit, which every line shares. */
    readonly start: IMainRoot;
    readonly line: List<ICommit>;
    /**
     * The current branch's index from the run's cache, or null for another branch, whose index
     * `indexOfCommits` works out when it is needed (FND-81).
     */
    readonly index: IRunIndex | null;
}

/** One branch as the tree shows it. */
export interface IBranchSummary {
    readonly id: BranchId;
    readonly name: string;
    readonly forkedFrom: BranchId | null;
    readonly forkedAt: Position;
    /** How many commits its line holds, the shared ones included. */
    readonly commits: number;
    readonly isCurrent: boolean;
}

function branchOf(history: IRunHistory, id: BranchId): IBranch {
    const branch = history.branches.get(id);
    return required(branch, `branch ${id}`);
}

/** The history with the current branch's own commits taken from the run's line of commits. */
function kept(run: IRunState): IRunHistory {
    const { history } = run;
    const branch = branchOf(history, history.current);
    const own = run.line.commits.skip(branch.forkedAt).toOrderedMap();
    const branches = history.branches.set(branch.id, { ...branch, commits: own });
    return { ...history, branches };
}

/**
 * Every commit on a branch's line, oldest first: those it shares, then its own. The history must
 * hold the current branch's own commits too, as {@link historyOf} gives it.
 */
export function lineOf(history: IRunHistory, id: BranchId): OrderedMap<CommitId, ICommit> {
    const branch = branchOf(history, id);
    if (branch.forkedFrom === null) {
        return branch.commits;
    }
    const parentLine = lineOf(history, branch.forkedFrom);
    const shared = parentLine.take(branch.forkedAt);
    return shared.concat(branch.commits);
}

/** The run on a line of commits, its cache worked out again from them. */
function onLine(
    run: IRunState,
    history: IRunHistory,
    commits: OrderedMap<CommitId, ICommit>,
): IRunState {
    const sessions = commits
        .valueSeq()
        .map((commit) => commit.session)
        .filter((session) => session !== null);
    const opened = ImmutableSet(sessions).size;
    const head = commits.last();
    const line: ICommitLine = {
        ...run.line,
        commits,
        head: head?.id ?? null,
        session: null,
        sessionsOpened: toCount(opened),
    };
    const noEntries = List<RunLogEntry>();
    const cache = rebuildRunCache(line, noEntries);
    const root = head?.root ?? run.line.start;
    return { ...run, history, line, root, cache };
}

/**
 * Starts a new branch at a place of the current one, and makes it current. It forks between
 * job runs and API calls, at the nearest such place at or before the one asked, as a job run or
 * an API call is one piece of work. It is named Fork n until a person renames it.
 */
export function forkAt(run: IRunState, place: Position): IRunState {
    const from = groupStartAtOrBefore(run, place);
    const history = kept(run);
    const forksMade = plusOne(history.forksMade);
    const id = toBranchId(`fork-${forksMade}`);
    const branch: IBranch = {
        id,
        name: `Fork ${forksMade}`,
        forkedFrom: history.current,
        forkedAt: from,
        commits: run.line.commits.clear(),
    };
    const branches = history.branches.set(id, branch);
    const forked: IRunHistory = { branches, current: id, forksMade };
    const shared = run.line.commits.take(from);
    return onLine(run, forked, shared);
}

/** Makes another branch current, at its latest commit. */
export function switchTo(run: IRunState, id: BranchId): IRunState {
    if (id === run.history.current) {
        return run;
    }
    const history = kept(run);
    const line = lineOf(history, id);
    // The current branch's own commits live in the run's line of commits, not here.
    const branch = branchOf(history, id);
    const branches = history.branches.set(id, { ...branch, commits: branch.commits.clear() });
    const switched = { ...history, branches, current: id };
    return onLine(run, switched, line);
}

/**
 * Whether a branch can be deleted: any but Main, once no branch forks from it, so deleting it
 * takes no other branch's commits with it (FND-81).
 */
export function canDeleteBranch(run: IRunState, id: BranchId): boolean {
    const branch = run.history.branches.get(id);
    const hasForks = run.history.branches.some((each) => each.forkedFrom === id);
    return branch !== undefined && branch.forkedFrom !== null && !hasForks;
}

/**
 * Deletes a branch with no forks of its own, never Main, and its own commits with it. Deleting
 * the branch being watched watches the branch it forked from, at its latest commit (FND-81).
 */
export function deleteBranch(run: IRunState, id: BranchId): IRunState {
    if (!canDeleteBranch(run, id)) {
        throw new RangeError('Only a branch with no forks of its own, other than Main, can go.');
    }
    const branch = branchOf(run.history, id);
    const parent = required(branch.forkedFrom, `the branch ${id} forked from`);
    const watched = run.history.current === id ? switchTo(run, parent) : run;
    const branches = watched.history.branches.delete(id);
    return { ...watched, history: { ...watched.history, branches } };
}

/** Gives a branch another name, which must not be blank. Its ID stays as it is. */
export function rename(run: IRunState, id: BranchId, name: string): IRunState {
    const trimmed = name.trim();
    if (trimmed === '') {
        throw new RangeError('A branch needs a name that is not blank.');
    }
    const branch = branchOf(run.history, id);
    const branches = run.history.branches.set(id, { ...branch, name: trimmed });
    return { ...run, history: { ...run.history, branches } };
}

/** Every branch, in the order they were made, as the tree shows them. */
export function branchesOf(run: IRunState): List<IBranchSummary> {
    const history = kept(run);
    return history.branches
        .valueSeq()
        .map((branch) => {
            const line =
                branch.id === history.current ? run.line.commits : lineOf(history, branch.id);
            return {
                id: branch.id,
                name: branch.name,
                forkedFrom: branch.forkedFrom,
                forkedAt: branch.forkedAt,
                commits: line.size,
                isCurrent: branch.id === history.current,
            };
        })
        .toList();
}

/** Every branch, in the order they were made, each with its whole line of commits. */
export function branchLinesOf(run: IRunState): List<IBranchLine> {
    const history = kept(run);
    return history.branches
        .valueSeq()
        .map((branch): IBranchLine => {
            const isCurrent = branch.id === history.current;
            const commits = isCurrent ? run.line.commits : lineOf(history, branch.id);
            return {
                id: branch.id,
                name: branch.name,
                forkedFrom: branch.forkedFrom,
                forkedAt: branch.forkedAt,
                isCurrent,
                start: run.line.start,
                line: commits.toList(),
                index: isCurrent ? run.cache.index : null,
            };
        })
        .toList();
}

/** Every branch's line, with the history they were worked out for. */
export interface IBranchLines {
    readonly history: IRunHistory;
    readonly lines: List<IBranchLine>;
}

/** The current branch's line, grown by the commits made since an earlier one of it. */
function grown(run: IRunState, earlier: IBranchLine): IBranchLine {
    const added = run.cache.commitIds.skip(earlier.line.size).map((id) => {
        const commit = run.line.commits.get(id);
        return required(commit, `commit ${id}`);
    });
    const line = earlier.line.concat(added);
    return { ...earlier, line, index: run.cache.index };
}

/**
 * Every branch's line, reusing earlier ones worked out for the same history: until it changes,
 * the other branches' lines stay as they were, and the current branch's line only grows, so only
 * its new commits are added. A run as long as a city day can then be drawn as it goes.
 */
export function branchLinesSince(run: IRunState, earlier: IBranchLines | null): IBranchLines {
    const { history } = run;
    if (earlier?.history !== history) {
        const lines = branchLinesOf(run);
        return { history, lines };
    }
    const lines = earlier.lines.map((line) => (line.isCurrent ? grown(run, line) : line));
    return { history, lines };
}

/**
 * The history with every branch's own commits, the current one's included: every commit once,
 * which is what a saved run keeps.
 */
export const historyOf = (run: IRunState): IRunHistory => kept(run);

/**
 * The history and line of commits a run is made of from every branch's own commits: the
 * current branch's line, and the history without its own commits, which the line holds.
 */
export function splitHistory(history: IRunHistory): {
    readonly history: IRunHistory;
    readonly line: OrderedMap<CommitId, ICommit>;
} {
    const line = lineOf(history, history.current);
    const branch = branchOf(history, history.current);
    const branches = history.branches.set(branch.id, {
        ...branch,
        commits: branch.commits.clear(),
    });
    return { history: { ...history, branches }, line };
}
