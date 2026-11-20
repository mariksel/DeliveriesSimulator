import { Set as ImmutableSet } from 'immutable';

import type { Position } from '../../domain/system/math/math';
import { toCount, toPosition } from '../../domain/system/math/math';
import type { Count } from '../../domain/system/math/math';
import { required } from '../../domain/system/validation/required';
import type { BranchId } from '../simulation-engine/branch-id';
import type { ICommit } from '../simulation-engine/commit';
import type { CommitId } from '../simulation-engine/commit-id';
import { EffectKind } from '../simulation-engine/direct-effect';
import type { FunctionLookup } from '../simulation-engine/function-lookup';
import type { FunctionName } from '../simulation-engine/function-name';
import type { IMainRoot } from '../simulation-engine/main-root';
import { functionNameOf, rootOfCall } from '../simulation-engine/rebuild-root';
import { historyOf, lineOf } from '../simulation-engine/run-branches';
import type { IRunState } from '../simulation-engine/run-state';
import type { IStateCall, StateFunction } from '../simulation-engine/state-call';
import { isSameValue } from './same-value';

/*
 * A snapshot test reruns a saved run statelessly: each state commit's stored call runs again on
 * its stored parent root, and the root it gives is compared with the one stored (FND-81). With the
 * run's own versions, every commit matches when recalculating is exact; with the newest, the first
 * commit that differs is the first a behaviour change affects.
 */

/** Which versions a snapshot test runs the stored calls with. */
export const SnapshotVersions = {
    /** The versions the run used, as recorded. */
    Own: 'Own',
    /** The newest version of each function, but those the run switched, kept as recorded. */
    Newest: 'Newest',
} as const;

/** One of the values of {@link SnapshotVersions}. */
export type SnapshotVersions = (typeof SnapshotVersions)[keyof typeof SnapshotVersions];

/** The first commit whose root came out differently: its branch, place on its line, and ID. */
export interface ISnapshotDifference {
    readonly branch: BranchId;
    readonly place: Position;
    readonly commit: CommitId;
}

/** How a snapshot test came out: how many commits it reran, and the first that differed. */
export interface ISnapshotResult {
    readonly versions: SnapshotVersions;
    readonly compared: Count;
    /** The first commit that came out differently, or null when every one matched. */
    readonly difference: ISnapshotDifference | null;
}

/** A state commit on a line, with the root stored before it. */
interface IStoredCall {
    readonly commit: ICommit;
    readonly call: IStateCall;
    readonly parent: IMainRoot;
    readonly place: Position;
}

/** Every state commit on a branch's own part of its line, each with its stored parent root. */
function storedCalls(run: IRunState, branch: BranchId): readonly IStoredCall[] {
    const history = historyOf(run);
    const found = history.branches.get(branch);
    const own = required(found, `branch ${branch}`);
    const line = lineOf(history, branch).valueSeq().toArray();
    return line.flatMap((commit, index) => {
        const place = toPosition(index + 1);
        const parent = line[index - 1]?.root ?? run.line.start;
        const isOwn = index >= own.forkedAt;
        return isOwn && commit.call !== null ? [{ commit, call: commit.call, parent, place }] : [];
    });
}

const NONE_SWITCHED = ImmutableSet<string>();

/** The functions a branch's line switched by an implementation change before a place. */
function switchedBefore(run: IRunState, branch: BranchId, place: Position): ImmutableSet<string> {
    const history = historyOf(run);
    const line = lineOf(history, branch)
        .valueSeq()
        .take(place - 1);
    return line.reduce((switched, commit) => {
        const { effect } = commit;
        if (effect?.kind !== EffectKind.ImplementationChange) {
            return switched;
        }
        const names = effect.after
            .filter((version, name) => effect.before.get(name) !== version)
            .keySeq();
        return switched.union(names);
    }, NONE_SWITCHED);
}

/** The function a stored call runs again with: its own, or its function's newest version. */
function functionFor(
    stored: IStoredCall,
    switched: ImmutableSet<string>,
    versions: SnapshotVersions,
    functions: FunctionLookup,
): StateFunction {
    if (versions === SnapshotVersions.Own) {
        return stored.call.fn;
    }
    const name: FunctionName = functionNameOf(functions, stored.call.fn);
    if (switched.has(name)) {
        return stored.call.fn;
    }
    const last = functions.versionsOf(name).at(-1);
    const newest = required(last, `a version of ${name}`);
    const fn: StateFunction = functions.functionOf(name, newest);
    return fn;
}

/** Whether a stored call, run again, gives the state its commit stored. */
function isRerunExact(
    run: IRunState,
    branch: BranchId,
    stored: IStoredCall,
    versions: SnapshotVersions,
    functions: FunctionLookup,
): boolean {
    const switched = switchedBefore(run, branch, stored.place);
    const fn = functionFor(stored, switched, versions, functions);
    const call = { ...stored.call, fn };
    const rebuilt = rootOfCall(stored.parent, call, functions);
    return isSameValue(rebuilt.state, stored.commit.root.state);
}

/**
 * Reruns a run's stored calls statelessly, branch by branch, with its own versions or the newest,
 * through a lookup that holds every version, the run's own unless one is given, and reports how
 * many commits it reran and the first that came out differently (FND-81).
 */
export function snapshotTest(
    run: IRunState,
    versions: SnapshotVersions,
    functions: FunctionLookup = run.functions,
): ISnapshotResult {
    const branches = historyOf(run).branches.keySeq().toArray();
    const calls = branches.flatMap((branch) =>
        storedCalls(run, branch).map((stored) => ({ branch, stored })),
    );
    const differs = calls.findIndex(
        ({ branch, stored }) => !isRerunExact(run, branch, stored, versions, functions),
    );
    const first = calls[differs];
    if (first === undefined) {
        return { versions, compared: toCount(calls.length), difference: null };
    }
    const { branch, stored } = first;
    const difference = { branch, place: stored.place, commit: stored.commit.id };
    return { versions, compared: toCount(differs + 1), difference };
}
