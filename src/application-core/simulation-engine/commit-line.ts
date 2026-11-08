import type { List } from 'immutable';
import { OrderedMap } from 'immutable';

import type { RunLogEntry } from './run-log-entry';
import type { CommitId } from './commit-id';
import { toCommitId } from './commit-id';
import { required } from '../../domain/system/validation/required';
import type { CommitKind, ICommit } from './commit';
import { CommitKind as CommitKinds } from './commit';
import type { DirectEffect } from './direct-effect';
import type { IMainRoot } from './main-root';
import { withDirectEffect, withIndirectEffect } from './main-root';
import type { IndirectEffect } from './indirect-effect';
import type { IStateCall } from './state-call';
import type { Count } from '../../domain/system/math/math';
import type { SimTime } from '../../domain/simulation-engine/sim-time';
import { NO_COUNT, plusOne } from '../../domain/system/math/math';
import { RUN_START } from '../../domain/simulation-engine/sim-time';
import type { SessionId } from './session-id';
import { toSessionId } from './session-id';

/** A job run or API call under way, and the simulated time its commits happen at. */
export interface IOpenSession {
    readonly id: SessionId;
    readonly at: SimTime;
}

/** A run's history: where it started, and every commit since, each keeping its main root. */
export interface ICommitLine {
    readonly start: IMainRoot;
    readonly commits: OrderedMap<CommitId, ICommit>;
    /** The latest commit, or null before the first. */
    readonly head: CommitId | null;
    /** The job run or API call under way, or null between them. */
    readonly session: IOpenSession | null;
    readonly sessionsOpened: Count;
}

/** A line of commits with none yet. */
export const createCommitLine = (start: IMainRoot): ICommitLine => ({
    start,
    commits: OrderedMap(),
    head: null,
    session: null,
    sessionsOpened: NO_COUNT,
});

/** The latest commit, or undefined before the first. */
export function headCommit(line: ICommitLine): ICommit | undefined {
    if (line.head === null) {
        return undefined;
    }
    const commit = line.commits.get(line.head);
    return required(commit, `commit ${line.head}`);
}

/** The main root the line has reached. */
export const headRoot = (line: ICommitLine): IMainRoot => headCommit(line)?.root ?? line.start;

/** The simulated time of the latest commit, which is where the run's clock has got to. */
export const headAt = (line: ICommitLine): SimTime => headCommit(line)?.at ?? RUN_START;

/**
 * Starts a job run or API call at a simulated time. Every commit until it is closed belongs to it,
 * and happens at that time.
 */
export function openSession(line: ICommitLine, at: SimTime): ICommitLine {
    const sessionsOpened = plusOne(line.sessionsOpened);
    const id = toSessionId(`session-${sessionsOpened}`);
    return { ...line, session: { id, at }, sessionsOpened };
}

/** Finishes the job run or API call under way. */
export const closeSession = (line: ICommitLine): ICommitLine => ({ ...line, session: null });

/** What a new commit holds, besides its place on the line. */
interface ICommitContent {
    readonly kind: CommitKind;
    readonly root: IMainRoot;
    readonly at: SimTime;
    readonly effect: DirectEffect | null;
    readonly indirect: IndirectEffect | null;
    readonly call: IStateCall | null;
    readonly entries: List<RunLogEntry>;
}

function append(line: ICommitLine, content: ICommitContent): ICommitLine {
    const id = toCommitId(`commit-${line.commits.size + 1}`);
    const commit: ICommit = {
        id,
        parent: line.head,
        session: line.session?.id ?? null,
        ...content,
    };
    return { ...line, commits: line.commits.set(id, commit), head: id };
}

/**
 * Makes a state commit, if the state changed from the root it came from, at the time of the job
 * run or API call under way, holding the call that made it. A state commit changes only the state
 * sub-root, so a change to the effects, or a commit outside a session, is a bug in the step that
 * made it, and stops the run.
 */
export function commitState(
    line: ICommitLine,
    before: IMainRoot,
    root: IMainRoot,
    call: IStateCall,
    entries: List<RunLogEntry>,
): ICommitLine {
    if (root.effects !== before.effects) {
        throw new Error('A state commit cannot change the effects.');
    }
    if (root.state === before.state) {
        return line;
    }
    const session = line.session;
    if (session === null) {
        throw new Error('A state commit happens inside a job run or API call.');
    }
    return append(line, {
        kind: CommitKinds.State,
        root,
        at: session.at,
        effect: null,
        indirect: null,
        call,
        entries,
    });
}

/** What an effect commit comes to: the line, and the new root. */
export interface IEffectCommitted {
    readonly line: ICommitLine;
    readonly root: IMainRoot;
}

/** Makes an effect commit. It adds a new effects sub-root and shares the state sub-root. */
export function commitDirectEffect(
    line: ICommitLine,
    before: IMainRoot,
    effect: DirectEffect,
    entries: List<RunLogEntry>,
): IEffectCommitted {
    const root = withDirectEffect(before, effect);
    const committed = append(line, {
        kind: effect.kind,
        root,
        at: effect.at,
        effect,
        indirect: null,
        call: null,
        entries,
    });
    return { line: committed, root };
}

/**
 * Makes an indirect commit, for a decision or change outside the service. It adds a new effects
 * sub-root that changes the indirect part only, and shares the state sub-root (FND-89).
 */
export function commitIndirectEffect(
    line: ICommitLine,
    before: IMainRoot,
    indirect: IndirectEffect,
    entries: List<RunLogEntry>,
): IEffectCommitted {
    const root = withIndirectEffect(before, indirect);
    const committed = append(line, {
        kind: CommitKinds.Indirect,
        root,
        at: indirect.at,
        effect: null,
        indirect,
        call: null,
        entries,
    });
    return { line: committed, root };
}
