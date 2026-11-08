import { List, OrderedMap } from 'immutable';

import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { CommitId } from '../../application-core/simulation-engine/commit-id';
import type { RestaurantId } from '../../domain/restaurants/restaurant-place';
import { toCommitId } from '../../application-core/simulation-engine/commit-id';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { toSessionId } from '../../application-core/simulation-engine/session-id';
import type { CommitKind, ICommit } from '../../application-core/simulation-engine/commit';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import { rebuildRunCache } from '../../application-core/simulation-engine/run-cache';
import type { IRunScript, IRunState } from '../../application-core/simulation-engine/run-state';
import type { InputCommand } from '../../application-core/simulation-engine/input-command';
import type { IRunHistory, IBranch } from '../../application-core/simulation-engine/run-history';
import {
    historyOf,
    lineOf,
    splitHistory,
} from '../../application-core/simulation-engine/run-branches';
import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import { toBranchId } from '../../application-core/simulation-engine/branch-id';
import { toPosition } from '../../domain/system/math/math';
import type { ScriptInput } from '../../application-core/simulation-engine/run-input';
import {
    isIndirectInput,
    isRulesInput,
    toIndirectLabel,
} from '../../application-core/simulation-engine/run-input';
import type { IPersistedParameterChange } from '../business-rules/persisted-parameter-change';
import {
    fromPersistedParameterChange,
    toPersistedParameterChange,
} from '../business-rules/persisted-parameter-change';
import type { ICommitLine } from '../../application-core/simulation-engine/commit-line';
import { headRoot } from '../../application-core/simulation-engine/commit-line';
import type { IPersistedRestaurantPlace } from '../restaurants/persisted-restaurant-place';
import {
    fromPersistedRestaurantPlace,
    toPersistedRestaurantPlace,
} from '../restaurants/persisted-restaurant-place';
import type { PersistedLogEntry } from './persisted-log-entry';
import { fromPersistedLogEntry, toPersistedLogEntry } from './persisted-log-entry';
import type { IPersistedCall } from './persisted-call';
import { fromPersistedCall, toPersistedCall } from './persisted-call';
import type { IPersistedMainRoot, PersistedDirectEffect } from './persisted-main-root';
import type {
    PersistedIndirectEffect,
    PersistedIndirectStatement,
} from './persisted-indirect-effect';
import {
    fromPersistedIndirectEffect,
    fromPersistedIndirectStatement,
    toPersistedIndirectEffect,
    toPersistedIndirectStatement,
} from './persisted-indirect-effect';
import {
    fromPersistedDirectEffect,
    fromPersistedMainRoot,
    toPersistedDirectEffect,
    toPersistedMainRoot,
} from './persisted-main-root';
import { toCount } from '../../domain/system/math/math';
import { toSimTime } from '../../domain/simulation-engine/sim-time';

/** A scripted step, persisted. */
export interface IPersistedScriptedStep {
    readonly at: number;
    readonly actor: string;
    readonly command: InputCommand;
    readonly order: string;
    /** The label of the indirect step it follows from, left out when it follows from none. */
    readonly after?: string;
}

/** A step of the script that states an indirect effect, persisted. */
export interface IPersistedIndirectStep {
    readonly at: number;
    readonly indirect: PersistedIndirectStatement;
}

/** A step of the script that changes rules, persisted. */
export interface IPersistedRulesStep {
    readonly at: number;
    readonly changes: readonly IPersistedParameterChange[];
}

/** One step of a run's script, persisted: a command, rules to change, or an indirect effect. */
export type PersistedScriptStep =
    IPersistedScriptedStep | IPersistedRulesStep | IPersistedIndirectStep;

/** A run's script, persisted. */
export interface IPersistedScript {
    readonly restaurants: readonly IPersistedRestaurantPlace[];
    readonly steps: readonly PersistedScriptStep[];
}

/** A commit, persisted with its root, what it holds, and the entries it wrote. */
export interface IPersistedCommit {
    readonly id: string;
    readonly kind: CommitKind;
    readonly parent: string | null;
    readonly session: string | null;
    readonly at: number;
    readonly root: IPersistedMainRoot;
    readonly effect: PersistedDirectEffect | null;
    readonly indirect: PersistedIndirectEffect | null;
    readonly call: IPersistedCall | null;
    readonly entries: readonly PersistedLogEntry[];
}

/** One branch of a run, persisted with its own commits after its fork, oldest first. */
export interface IPersistedBranch {
    readonly id: string;
    readonly name: string;
    readonly forkedFrom: string | null;
    readonly forkedAt: number;
    readonly commits: readonly IPersistedCommit[];
}

/**
 * A run, persisted: its script, where it started, and every branch with its own commits, so
 * every commit is kept once (FND-87).
 */
export interface IPersistedRun {
    readonly script: IPersistedScript;
    readonly start: IPersistedMainRoot;
    /**
     * Every branch, in the order they were made, each after the one it forked from. Stored as
     * timelines, the name branches had when saved runs began, so those runs still read.
     */
    readonly timelines: readonly IPersistedBranch[];
    readonly current: string;
    readonly forksMade: number;
    /** How many sessions the current branch's line has opened. */
    readonly sessionsOpened: number;
}

function toPersistedStep(step: ScriptInput): PersistedScriptStep {
    if (isRulesInput(step)) {
        const changes = step.changes.map(toPersistedParameterChange).toArray();
        return { at: step.at.milliseconds, changes };
    }
    if (isIndirectInput(step)) {
        const indirect = toPersistedIndirectStatement(step.indirect);
        return { at: step.at.milliseconds, indirect };
    }
    return {
        at: step.at.milliseconds,
        actor: step.actor,
        command: step.command,
        order: step.order,
        ...(step.after === undefined ? {} : { after: step.after }),
    };
}

function fromPersistedStep(step: PersistedScriptStep): ScriptInput {
    const at = toSimTime(step.at);
    if ('changes' in step) {
        const persisted = List(step.changes);
        const changes = persisted.map(fromPersistedParameterChange);
        return { at, changes };
    }
    if ('indirect' in step) {
        const indirect = fromPersistedIndirectStatement(step.indirect);
        return { at, indirect };
    }
    const actor = toInputActor(step.actor);
    const order = toInputOrderName(step.order);
    const after = step.after === undefined ? {} : { after: toIndirectLabel(step.after) };
    return { at, actor, command: step.command, order, ...after };
}

const toPersistedScript = (script: IRunScript): IPersistedScript => ({
    restaurants: script.restaurants.valueSeq().map(toPersistedRestaurantPlace).toArray(),
    steps: script.steps.map(toPersistedStep).toArray(),
});

function fromPersistedScript(script: IPersistedScript): IRunScript {
    const restaurants = script.restaurants.map((persisted): [RestaurantId, RestaurantPlace] => {
        const place = fromPersistedRestaurantPlace(persisted);
        return [place.id, place];
    });
    const steps = script.steps.map(fromPersistedStep);
    return { restaurants: OrderedMap(restaurants), steps: List(steps) };
}

function toPersistedCommit(commit: ICommit, parent: IMainRoot): IPersistedCommit {
    return {
        id: commit.id,
        kind: commit.kind,
        parent: commit.parent,
        session: commit.session,
        at: commit.at.milliseconds,
        root: toPersistedMainRoot(commit.root),
        effect: commit.effect === null ? null : toPersistedDirectEffect(commit.effect),
        indirect: commit.indirect === null ? null : toPersistedIndirectEffect(commit.indirect),
        call: commit.call === null ? null : toPersistedCall(commit.call, parent),
        entries: commit.entries.map(toPersistedLogEntry).toArray(),
    };
}

function fromPersistedCommit(commit: IPersistedCommit, parent: IMainRoot): ICommit {
    const entries = commit.entries.map(fromPersistedLogEntry);
    return {
        id: toCommitId(commit.id),
        kind: commit.kind,
        parent: commit.parent === null ? null : toCommitId(commit.parent),
        session: commit.session === null ? null : toSessionId(commit.session),
        at: toSimTime(commit.at),
        root: fromPersistedMainRoot(commit.root),
        effect: commit.effect === null ? null : fromPersistedDirectEffect(commit.effect),
        indirect: commit.indirect === null ? null : fromPersistedIndirectEffect(commit.indirect),
        call: commit.call === null ? null : fromPersistedCall(commit.call, parent),
        entries: List<RunLogEntry>(entries),
    };
}

/** The root a branch's own commit at an index came from: the one before it on its line. */
function rootBefore(
    line: OrderedMap<CommitId, ICommit>,
    branch: IBranch,
    index: number,
    start: IMainRoot,
): IMainRoot {
    const place = branch.forkedAt + index;
    return place === 0 ? start : (line.valueSeq().get(place - 1)?.root ?? start);
}

/**
 * A run, persisted as plain data. Application records are never stored directly: each is mapped
 * to its persisted record. A run is saved between job runs and API calls, never during one.
 */
export function toPersistedRun(run: IRunState): IPersistedRun {
    const commitLine = run.line;
    if (commitLine.session !== null) {
        throw new Error('A run is saved between job runs and API calls, not during one.');
    }
    const history = historyOf(run);
    const branches = history.branches
        .valueSeq()
        .map((branch): IPersistedBranch => {
            const line = lineOf(history, branch.id);
            const commits = branch.commits
                .valueSeq()
                .map((commit, index) => {
                    const parent = rootBefore(line, branch, index, commitLine.start);
                    return toPersistedCommit(commit, parent);
                })
                .toArray();
            return {
                id: branch.id,
                name: branch.name,
                forkedFrom: branch.forkedFrom,
                forkedAt: branch.forkedAt,
                commits,
            };
        })
        .toArray();
    return {
        script: toPersistedScript(run.script),
        start: toPersistedMainRoot(commitLine.start),
        timelines: branches,
        current: history.current,
        forksMade: history.forksMade,
        sessionsOpened: commitLine.sessionsOpened,
    };
}

/** Branches restored so far, and each one's line of commits. */
interface IRestored {
    readonly branches: OrderedMap<BranchId, IBranch>;
    readonly lines: OrderedMap<BranchId, OrderedMap<CommitId, ICommit>>;
}

function restoreBranch(
    restored: IRestored,
    persisted: IPersistedBranch,
    start: IMainRoot,
): IRestored {
    const id = toBranchId(persisted.id);
    const forkedFrom = persisted.forkedFrom === null ? null : toBranchId(persisted.forkedFrom);
    const forkedAt = toPosition(persisted.forkedAt);
    const parentLine = forkedFrom === null ? undefined : restored.lines.get(forkedFrom);
    const shared = parentLine?.take(forkedAt) ?? OrderedMap<CommitId, ICommit>();
    const line = persisted.commits.reduce((soFar, commit) => {
        const parent = soFar.last()?.root ?? start;
        const restoredCommit = fromPersistedCommit(commit, parent);
        return soFar.set(restoredCommit.id, restoredCommit);
    }, shared);
    const own = line.skip(forkedAt).toOrderedMap();
    const branch: IBranch = {
        id,
        name: persisted.name,
        forkedFrom,
        forkedAt,
        commits: own,
    };
    return {
        branches: restored.branches.set(id, branch),
        lines: restored.lines.set(id, line),
    };
}

/** A run, from its persisted form, with its root and cache worked out again. */
export function fromPersistedRun(persisted: IPersistedRun): IRunState {
    const start = fromPersistedMainRoot(persisted.start);
    const none: IRestored = { branches: OrderedMap(), lines: OrderedMap() };
    const restored = persisted.timelines.reduce(
        (soFar, branch) => restoreBranch(soFar, branch, start),
        none,
    );
    const whole: IRunHistory = {
        branches: restored.branches,
        current: toBranchId(persisted.current),
        forksMade: toCount(persisted.forksMade),
    };
    const split = splitHistory(whole);
    const line: ICommitLine = {
        start,
        commits: split.line,
        head: split.line.last()?.id ?? null,
        session: null,
        sessionsOpened: toCount(persisted.sessionsOpened),
    };
    const entries = List<RunLogEntry>();
    return {
        script: fromPersistedScript(persisted.script),
        history: split.history,
        line,
        root: headRoot(line),
        cache: rebuildRunCache(line, entries),
    };
}
