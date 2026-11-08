import type { List } from 'immutable';

import type { RunLogEntry } from './run-log-entry';
import type { SessionId } from './session-id';
import type { DirectEffect } from './direct-effect';
import { EffectKind } from './direct-effect';
import type { IndirectEffect } from './indirect-effect';
import type { IMainRoot } from './main-root';
import type { IStateCall } from './state-call';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import type { CommitId } from './commit-id';

/**
 * What a commit is. A state commit replaces the state sub-root, and the others the effects
 * sub-root: an indirect commit its indirect part only, and the rest its direct part.
 */
export const CommitKind = {
    State: 'State',
    ...EffectKind,
    Indirect: 'Indirect',
} as const;

/** One of the values of {@link CommitKind}. */
export type CommitKind = (typeof CommitKind)[keyof typeof CommitKind];

/** One moment in a run's history. A commit points back at the one before it, and never forward. */
export interface ICommit {
    readonly id: CommitId;
    readonly kind: CommitKind;
    /** The earlier commit, or null for a run's first. */
    readonly parent: CommitId | null;
    /** The job run or API call it happened in, which is what groups commits on the timeline. */
    readonly session: SessionId | null;
    /** Simulated time, in whole milliseconds. */
    readonly at: SimTime;
    readonly root: IMainRoot;
    /** What crossed the boundary, or null for a state or indirect commit. */
    readonly effect: DirectEffect | null;
    /** What happened outside the service, for an indirect commit, or null for the others. */
    readonly indirect: IndirectEffect | null;
    /** The pure function a state commit ran, and its arguments, or null for an effect commit. */
    readonly call: IStateCall | null;
    /**
     * The log entries written since the commit before it: the event log is these, commit after
     * commit.
     */
    readonly entries: List<RunLogEntry>;
}
