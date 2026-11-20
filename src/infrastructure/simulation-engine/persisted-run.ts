import type { IPersistedFunctionUse } from './persisted-function-use';
import { fromPersistedFunctionUse, toPersistedFunctionUse } from './persisted-function-use';
import type { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import { REGISTERED_FUNCTIONS } from './function-registry';
import { List, OrderedMap } from 'immutable';

import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';
import type { RestaurantPlace } from '../../domain/restaurants/restaurant-place';
import type { CommitId } from '../../application-core/simulation-engine/commit-id';
import type { RestaurantId } from '../../domain/restaurants/restaurant-place';
import type { Customer, CustomerId } from '../../domain/restaurants/customers/customer';
import { toCustomerId } from '../../domain/restaurants/customers/customer';
import type {
    AddressId,
    DeliveryAddress,
} from '../../domain/restaurants/customers/delivery-address';
import { toAddressId } from '../../domain/restaurants/customers/delivery-address';
import type {
    IPersistedCustomer,
    IPersistedDeliveryAddress,
} from '../restaurants/customers/persisted-customer';
import {
    fromPersistedCustomer,
    fromPersistedDeliveryAddress,
    toPersistedCustomer,
    toPersistedDeliveryAddress,
} from '../restaurants/customers/persisted-customer';
import { toCommitId } from '../../application-core/simulation-engine/commit-id';
import {
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { toSessionId } from '../../application-core/simulation-engine/session-id';
import type { CommitKind, ICommit } from '../../application-core/simulation-engine/commit';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import type { IRebuildMismatch } from '../../application-core/simulation-engine/rebuild-root';
import { rebuiltRoot, withEffectsOf } from '../../application-core/simulation-engine/rebuild-root';
import { textDigest } from '../../domain/simulation-engine/text-digest';
import { rebuildRunCache } from '../../application-core/simulation-engine/run-cache';
import type { IRunScript, IRunState } from '../../application-core/simulation-engine/run-state';
import type { OrderCommand } from '../../application-core/simulation-engine/input-command';
import type { IRider } from '../../application-core/simulation-engine/rider';
import { Duration } from '../../domain/system/time/duration';
import type { DriverId } from '../../domain/drivers/driver';
import { toDriverId } from '../../domain/drivers/driver';
import type { IRunHistory, IBranch } from '../../application-core/simulation-engine/run-history';
import {
    historyOf,
    lineOf,
    splitHistory,
} from '../../application-core/simulation-engine/run-branches';
import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import { toBranchId } from '../../application-core/simulation-engine/branch-id';
import type { Count, Position } from '../../domain/system/math/math';
import { toPosition } from '../../domain/system/math/math';
import type { ScriptInput } from '../../application-core/simulation-engine/run-input';
import {
    isIndirectInput,
    isRulesInput,
    isUseInput,
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
import type {
    IPersistedMainRoot,
    IPersistedRootChange,
    PersistedDirectEffect,
} from './persisted-main-root';
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
    fromPersistedEffectsChange,
    fromPersistedMainRoot,
    fromPersistedStateChange,
    toPersistedDirectEffect,
    toPersistedMainRoot,
    toPersistedRootChange,
} from './persisted-main-root';
import { toCount } from '../../domain/system/math/math';
import { required } from '../../domain/system/validation/required';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import type { IPersistedCity } from '../map-and-routing/persisted-city';
import { fromPersistedCity, toPersistedCity } from '../map-and-routing/persisted-city';

/** A scripted step, persisted. */
export interface IPersistedScriptedStep {
    readonly at: number;
    readonly actor: string;
    readonly command: OrderCommand;
    readonly order: string;
    /** The label of the indirect step it follows from, left out when it follows from none. */
    readonly after?: string;
    /** A create-order step's customer and address, left out on every other step (FND-90). */
    readonly customer?: string;
    readonly address?: string;
    /** True for a pick-up or delivery that runs at its time, not waiting for its driver. */
    readonly isAtItsTime?: true;
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
    /** The label of an earlier indirect step the change follows from, if any (FND-89). */
    readonly after?: string;
}

/** A step of the script that switches functions to other versions, persisted (FND-81). */
export interface IPersistedUseStep {
    readonly at: number;
    readonly uses: readonly IPersistedFunctionUse[];
    /** The label of an earlier indirect step the switch follows from, if any (FND-89). */
    readonly after?: string;
}

/**
 * One step of a run's script, persisted: a command, rules to change, functions to switch, or an
 * indirect effect.
 */
export type PersistedScriptStep =
    IPersistedScriptedStep | IPersistedRulesStep | IPersistedUseStep | IPersistedIndirectStep;

/** A driver the simulator rides, persisted: how often their app sends, and how fast they ride. */
export interface IPersistedRider {
    readonly driverId: string;
    readonly sendEveryMs: number;
    readonly speedKmh: number;
    /** Set for a driver in a run saved before waiting points, who stays where they finish. */
    readonly isStayingWhenIdle?: true;
}

/** A driver the simulator rides, persisted. */
export const toPersistedRider = (rider: IRider): IPersistedRider => ({
    driverId: rider.driverId,
    sendEveryMs: rider.sendEvery.milliseconds,
    speedKmh: rider.speedKmh,
    ...(rider.isStayingWhenIdle === true ? { isStayingWhenIdle: true } : {}),
});

/** A driver the simulator rides, from their persisted form. */
export function fromPersistedRider(rider: IPersistedRider): IRider {
    const driverId = toDriverId(rider.driverId);
    const sendEvery = Duration.ofMilliseconds(rider.sendEveryMs);
    const ridden = { driverId, sendEvery, speedKmh: rider.speedKmh };
    return rider.isStayingWhenIdle === true ? { ...ridden, isStayingWhenIdle: true } : ridden;
}

/** A run's script, persisted. */
export interface IPersistedScript {
    /** Absent for a run with no city: one with no scenario, or saved before runs had cities. */
    readonly city?: IPersistedCity;
    readonly restaurants: readonly IPersistedRestaurantPlace[];
    /** Absent for a run saved before orders had customers, which made no order (FND-90). */
    readonly customers?: readonly IPersistedCustomer[];
    readonly addresses?: readonly IPersistedDeliveryAddress[];
    /** Absent for a run saved before drivers' apps sent their locations (FND-90). */
    readonly riders?: readonly IPersistedRider[];
    readonly steps: readonly PersistedScriptStep[];
}

/**
 * A commit, persisted with what it holds, the entries it wrote, and its root's change from its
 * parent's, so each record, version, and effect is saved once and loaded roots share structure
 * again (FND-81).
 */
export interface IPersistedCommit {
    readonly id: string;
    readonly kind: CommitKind;
    readonly parent: string | null;
    readonly session: string | null;
    readonly at: number;
    /** At "everything": its root's change from its parent's. */
    readonly change?: IPersistedRootChange;
    /**
     * At "minimum", in place of the change: a digest of the change, chained with the digest of
     * the commit before it on its line, which the root worked out again must match (FND-81).
     */
    readonly digest?: string;
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
    /** Every branch, in the order they were made, each after the one it forked from. */
    readonly branches: readonly IPersistedBranch[];
    readonly current: string;
    readonly forksMade: number;
    /** How many sessions the current branch's line has opened. */
    readonly sessionsOpened: number;
}

function toPersistedStep(step: ScriptInput): PersistedScriptStep {
    if (isRulesInput(step)) {
        const changes = step.changes.map(toPersistedParameterChange).toArray();
        const after = step.after === undefined ? {} : { after: step.after };
        return { at: step.at.milliseconds, changes, ...after };
    }
    if (isIndirectInput(step)) {
        const indirect = toPersistedIndirectStatement(step.indirect);
        return { at: step.at.milliseconds, indirect };
    }
    if (isUseInput(step)) {
        const uses = step.uses.map(toPersistedFunctionUse).toArray();
        const after = step.after === undefined ? {} : { after: step.after };
        return { at: step.at.milliseconds, uses, ...after };
    }
    const destination =
        step.customer === undefined || step.address === undefined
            ? {}
            : { customer: step.customer, address: step.address };
    return {
        at: step.at.milliseconds,
        actor: step.actor,
        command: step.command,
        order: step.order,
        ...(step.after === undefined ? {} : { after: step.after }),
        ...destination,
        ...(step.isAtItsTime === true ? { isAtItsTime: true as const } : {}),
    };
}

function fromPersistedStep(step: PersistedScriptStep): ScriptInput {
    const at = toSimTime(step.at);
    if ('changes' in step) {
        const persisted = List(step.changes);
        const changes = persisted.map(fromPersistedParameterChange);
        const after = step.after === undefined ? {} : { after: toIndirectLabel(step.after) };
        return { at, changes, ...after };
    }
    if ('indirect' in step) {
        const indirect = fromPersistedIndirectStatement(step.indirect);
        return { at, indirect };
    }
    if ('uses' in step) {
        const uses = step.uses.map(fromPersistedFunctionUse);
        const after = step.after === undefined ? {} : { after: toIndirectLabel(step.after) };
        return { at, uses: List(uses), ...after };
    }
    const actor = toInputActor(step.actor);
    const order = toInputOrderName(step.order);
    const after = step.after === undefined ? {} : { after: toIndirectLabel(step.after) };
    const destination =
        step.customer === undefined || step.address === undefined
            ? {}
            : { customer: toCustomerId(step.customer), address: toAddressId(step.address) };
    const timing = step.isAtItsTime === true ? { isAtItsTime: true } : {};
    return { at, actor, command: step.command, order, ...after, ...destination, ...timing };
}

const toPersistedScript = (script: IRunScript): IPersistedScript => ({
    ...(script.city === null ? {} : { city: toPersistedCity(script.city) }),
    restaurants: script.restaurants.valueSeq().map(toPersistedRestaurantPlace).toArray(),
    customers: script.customers.valueSeq().map(toPersistedCustomer).toArray(),
    addresses: script.addresses.valueSeq().map(toPersistedDeliveryAddress).toArray(),
    riders: script.riders.valueSeq().map(toPersistedRider).toArray(),
    steps: script.steps.map(toPersistedStep).toArray(),
});

function fromPersistedScript(script: IPersistedScript): IRunScript {
    const restaurants = script.restaurants.map((persisted): [RestaurantId, RestaurantPlace] => {
        const place = fromPersistedRestaurantPlace(persisted);
        return [place.id, place];
    });
    const customers = (script.customers ?? []).map((persisted): [CustomerId, Customer] => {
        const customer = fromPersistedCustomer(persisted);
        return [customer.id, customer];
    });
    const addresses = (script.addresses ?? []).map((persisted): [AddressId, DeliveryAddress] => {
        const address = fromPersistedDeliveryAddress(persisted);
        return [address.id, address];
    });
    const riders = (script.riders ?? []).map((persisted): [DriverId, IRider] => {
        const rider = fromPersistedRider(persisted);
        return [rider.driverId, rider];
    });
    const steps = script.steps.map(fromPersistedStep);
    const city = script.city === undefined ? null : fromPersistedCity(script.city);
    return {
        city,
        restaurants: OrderedMap(restaurants),
        customers: OrderedMap(customers),
        riders: OrderedMap(riders),
        addresses: OrderedMap(addresses),
        steps: List(steps),
    };
}

/** Whether two lists of effects end the same: the same size, and the same last effect. */
const isSameEnd = <TEffect>(left: List<TEffect>, right: List<TEffect>): boolean =>
    left === right || (left.size === right.size && left.last() === right.last());

/**
 * The root a commit's change is taken from: its parent's with its own effect added. A root that
 * holds other effects would lose them on load, so it is refused.
 */
function changeBase(commit: ICommit, parent: IMainRoot): IMainRoot {
    const base = withEffectsOf(parent, commit.effect, commit.indirect);
    const { effects } = commit.root;
    const isDerived =
        isSameEnd(base.effects.direct.records, effects.direct.records) &&
        isSameEnd(base.effects.indirect.records, effects.indirect.records);
    if (!isDerived) {
        throw new Error(`Commit ${commit.id} holds effects other than its own and its parent's.`);
    }
    return base;
}

function toPersistedCommit(commit: ICommit, parent: IMainRoot): IPersistedCommit {
    const base = changeBase(commit, parent);
    return {
        id: commit.id,
        kind: commit.kind,
        parent: commit.parent,
        session: commit.session,
        at: commit.at.milliseconds,
        change: toPersistedRootChange(base, commit.root),
        effect: commit.effect === null ? null : toPersistedDirectEffect(commit.effect),
        indirect: commit.indirect === null ? null : toPersistedIndirectEffect(commit.indirect),
        call: commit.call === null ? null : toPersistedCall(commit.call, parent),
        entries: commit.entries.map(toPersistedLogEntry).toArray(),
    };
}

/** A commit's change's digest, chained with the digest of the commit before it on its line. */
function changeDigest(before: string, change: IPersistedRootChange): string {
    const text = JSON.stringify(change);
    return textDigest([before, text]);
}

/** What a commit holds besides its root and its effect, from its persisted form. */
function restoredParts(
    commit: IPersistedCommit,
    parent: IMainRoot,
): Omit<ICommit, 'root' | 'effect'> {
    const entries = commit.entries.map(fromPersistedLogEntry);
    return {
        id: toCommitId(commit.id),
        kind: commit.kind,
        parent: commit.parent === null ? null : toCommitId(commit.parent),
        session: commit.session === null ? null : toSessionId(commit.session),
        at: toSimTime(commit.at),
        indirect: commit.indirect === null ? null : fromPersistedIndirectEffect(commit.indirect),
        call: commit.call === null ? null : fromPersistedCall(commit.call, parent),
        entries: List<RunLogEntry>(entries),
    };
}

/** A commit saved at "everything", its root its parent's with its change applied. */
function fromChangedCommit(
    commit: IPersistedCommit,
    change: IPersistedRootChange,
    parent: IMainRoot,
): ICommit {
    const parts = restoredParts(commit, parent);
    const state = fromPersistedStateChange(parent.state, change);
    const effect =
        commit.effect === null ? null : fromPersistedDirectEffect(commit.effect, { state });
    const base = withEffectsOf({ state, effects: parent.effects }, effect, parts.indirect);
    const effects = fromPersistedEffectsChange(base.effects, change);
    return { ...parts, effect, root: { state, effects } };
}

/** Where a commit sits: its branch, and its place on that branch's line. */
interface ICommitPlace {
    readonly branch: BranchId;
    readonly place: Position;
}

/**
 * The error a commit worked out again throws when it does not match its digest, naming where it
 * is, so a snapshot test can say which commit came out differently (FND-81).
 */
function mismatchAt(where: ICommitPlace, commit: CommitId): Error & IRebuildMismatch {
    const error = new Error(`Commit ${commit} worked out differently from when it was saved.`);
    const mismatch: IRebuildMismatch = { kind: 'RebuildMismatch', ...where, commit };
    return Object.assign(error, mismatch);
}

/** A commit, and the digest of its change chained, for the next one to follow. */
interface IRestoredCommit {
    readonly commit: ICommit;
    readonly digest: string;
}

/**
 * A commit saved at "minimum", its root worked out again from its parent's: its call run again,
 * or its own effect added. A root whose change does not match the digest saved for it stops the
 * load, as the run would not be the one saved (FND-81).
 */
function fromRebuiltCommit(
    commit: IPersistedCommit,
    parent: IMainRoot,
    before: string,
    functions: FunctionLookup,
    where: ICommitPlace,
): IRestoredCommit {
    const parts = restoredParts(commit, parent);
    const effect =
        commit.effect === null
            ? null
            : fromPersistedDirectEffect(commit.effect, { state: parent.state });
    const holding = { ...parts, effect };
    const root = rebuiltRoot(parent, holding, functions);
    const base = withEffectsOf(parent, effect, parts.indirect);
    const change = toPersistedRootChange(base, root);
    const digest = changeDigest(before, change);
    if (digest !== commit.digest) {
        const id = toCommitId(commit.id);
        throw mismatchAt(where, id);
    }
    return { commit: { ...holding, root }, digest };
}

/** A commit from its persisted form: from its change, or worked out again. */
function fromPersistedCommit(
    commit: IPersistedCommit,
    parent: IMainRoot,
    before: string,
    functions: FunctionLookup,
    where: ICommitPlace,
): IRestoredCommit {
    if (commit.change === undefined) {
        return fromRebuiltCommit(commit, parent, before, functions, where);
    }
    const restored = fromChangedCommit(commit, commit.change, parent);
    return { commit: restored, digest: before };
}

/** A branch's own commits, persisted, each with its change from the root before it. */
function toPersistedCommits(
    line: OrderedMap<CommitId, ICommit>,
    branch: IBranch,
    start: IMainRoot,
): readonly IPersistedCommit[] {
    const forkRoot =
        branch.forkedAt === 0 ? start : (line.valueSeq().get(branch.forkedAt - 1)?.root ?? start);
    const own = branch.commits.valueSeq().toArray();
    return own.map((commit, index) => {
        const parent = own[index - 1]?.root ?? forkRoot;
        return toPersistedCommit(commit, parent);
    });
}

/** A commit at "minimum": its change dropped for its digest. */
const withDigest = (commit: IPersistedCommit, digest: string): IPersistedCommit => ({
    id: commit.id,
    kind: commit.kind,
    parent: commit.parent,
    session: commit.session,
    at: commit.at,
    digest,
    effect: commit.effect,
    indirect: commit.indirect,
    call: commit.call,
    entries: commit.entries,
});

/**
 * A run's branches at "minimum": each commit's change dropped for its digest, chained along its
 * line, so a fork's first commit follows the digest of the commit it forked after (FND-81). A
 * run is persisted at "everything" and moved down by this.
 */
export function atMinimum(branches: readonly IPersistedBranch[]): readonly IPersistedBranch[] {
    const lines = new Map<string, readonly string[]>();
    return branches.map((branch) => {
        const parentLine = branch.forkedFrom === null ? [] : (lines.get(branch.forkedFrom) ?? []);
        const digests: string[] = parentLine.slice(0, branch.forkedAt);
        const commits = branch.commits.map((commit) => {
            const before = digests.at(-1) ?? '';
            const change = required(commit.change, `the change of commit ${commit.id}`);
            const digest = changeDigest(before, change);
            digests.push(digest);
            return withDigest(commit, digest);
        });
        lines.set(branch.id, digests);
        return { ...branch, commits };
    });
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
            const commits = toPersistedCommits(line, branch, commitLine.start);
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
        branches,
        current: history.current,
        forksMade: history.forksMade,
        sessionsOpened: commitLine.sessionsOpened,
    };
}

/** Branches restored so far, each one's line of commits, and the digests along that line. */
interface IRestored {
    readonly branches: OrderedMap<BranchId, IBranch>;
    readonly lines: OrderedMap<BranchId, OrderedMap<CommitId, ICommit>>;
    readonly digests: OrderedMap<BranchId, List<string>>;
}

/** Where a branch forked, and the line and digests it shares with the branch it forked from. */
function forkOf(
    restored: IRestored,
    persisted: IPersistedBranch,
): {
    readonly forkedFrom: BranchId | null;
    readonly forkedAt: Position;
    readonly line: OrderedMap<CommitId, ICommit>;
    readonly digests: List<string>;
} {
    const forkedAt = toPosition(persisted.forkedAt);
    if (persisted.forkedFrom === null) {
        return { forkedFrom: null, forkedAt, line: OrderedMap(), digests: List() };
    }
    const forkedFrom = toBranchId(persisted.forkedFrom);
    const parentLine = restored.lines.get(forkedFrom) ?? OrderedMap<CommitId, ICommit>();
    const parentDigests = restored.digests.get(forkedFrom) ?? List<string>();
    const line = parentLine.take(forkedAt);
    const digests = parentDigests.take(forkedAt);
    return { forkedFrom, forkedAt, line, digests };
}

/** Restores a branch's own commits one at a time, after the line it forked from. */
function* restoringBranch(
    restored: IRestored,
    persisted: IPersistedBranch,
    start: IMainRoot,
    functions: FunctionLookup,
): Generator<void, IRestored> {
    const id = toBranchId(persisted.id);
    const fork = forkOf(restored, persisted);
    const { forkedFrom, forkedAt } = fork;
    let { line, digests } = fork;
    for (const commit of persisted.commits) {
        const parent = line.last()?.root ?? start;
        const before = digests.last() ?? '';
        const where = { branch: id, place: toPosition(line.size + 1) };
        const next = fromPersistedCommit(commit, parent, before, functions, where);
        line = line.set(next.commit.id, next.commit);
        digests = digests.push(next.digest);
        yield;
    }
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
        digests: restored.digests.set(id, digests),
    };
}

/** A run from its restored branches, with its line, root, and cache worked out. */
function restoredRun(
    persisted: IPersistedRun,
    restored: IRestored,
    start: IMainRoot,
    functions: FunctionLookup,
): IRunState {
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
        functions,
    };
}

/** Restores a run one commit at a time, so a caller can pause between commits. */
function* restoringRun(
    persisted: IPersistedRun,
    functions: FunctionLookup,
): Generator<void, IRunState> {
    const start = fromPersistedMainRoot(persisted.start);
    let restored: IRestored = {
        branches: OrderedMap(),
        lines: OrderedMap(),
        digests: OrderedMap(),
    };
    for (const branch of persisted.branches) {
        restored = yield* restoringBranch(restored, branch, start, functions);
    }
    return restoredRun(persisted, restored, start, functions);
}

/** Every commit on a persisted branch's line, oldest first: those it shares, then its own. */
function persistedLine(
    branches: readonly IPersistedBranch[],
    id: string,
): readonly IPersistedCommit[] {
    const branch = branches.find((each) => each.id === id);
    if (branch === undefined) {
        return [];
    }
    if (branch.forkedFrom === null) {
        return branch.commits;
    }
    const parentLine = persistedLine(branches, branch.forkedFrom);
    const shared = parentLine.slice(0, branch.forkedAt);
    return [...shared, ...branch.commits];
}

/**
 * A persisted run without a branch with no forks of its own, never Main, as when it is deleted
 * from a saved run (FND-81). Deleting the current branch makes the one it forked from current.
 * A run that never had the branch is given back as it is. Other branches' commits, and the
 * digests chained along them, are left as they are.
 */
export function withoutBranch(persisted: IPersistedRun, id: string): IPersistedRun {
    const branch = persisted.branches.find((each) => each.id === id);
    if (branch === undefined) {
        return persisted;
    }
    const hasForks = persisted.branches.some((each) => each.forkedFrom === id);
    if (branch.forkedFrom === null || hasForks) {
        throw new RangeError('Only a branch with no forks of its own, other than Main, can go.');
    }
    const branches = persisted.branches.filter((each) => each.id !== id);
    if (persisted.current !== id) {
        return { ...persisted, branches };
    }
    const current = branch.forkedFrom;
    const line = persistedLine(branches, current);
    const sessions = line.flatMap((commit) => (commit.session === null ? [] : [commit.session]));
    const sessionsOpened = new Set(sessions).size;
    return { ...persisted, branches, current, sessionsOpened };
}

/** How many commits a persisted run holds: every branch's own ones. */
export const commitCount = (persisted: IPersistedRun): number =>
    persisted.branches.reduce((sum, branch) => sum + branch.commits.length, 0);

/**
 * A run from its persisted records, carrying the lookup of state functions it calls through,
 * the registry's by default (FND-81). A run saved at "minimum" has each root worked out again.
 */
export function fromPersistedRun(
    persisted: IPersistedRun,
    functions: FunctionLookup = REGISTERED_FUNCTIONS,
): IRunState {
    const restoring = restoringRun(persisted, functions);
    let step = restoring.next();
    while (step.done !== true) {
        step = restoring.next();
    }
    return step.value;
}

/** How far a restore has got: the commits restored, of all the run holds. */
export interface IRestoreProgress {
    readonly done: Count;
    readonly total: Count;
}

/** Waits for the next turn of the event loop, so a page can draw and respond. */
const nextTurn = (): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

/**
 * A run from its persisted records, restored in chunks of commits with a pause between them,
 * telling its progress after each, so a page stays responsive while a run saved at "minimum" has
 * its roots worked out again (FND-81).
 */
export async function fromPersistedRunInChunks(
    persisted: IPersistedRun,
    functions: FunctionLookup,
    onProgress: (progress: IRestoreProgress) => void,
    chunkSize: number,
): Promise<IRunState> {
    const count = commitCount(persisted);
    const total = toCount(count);
    const restoring = restoringRun(persisted, functions);
    let done = 0;
    let step = restoring.next();
    while (step.done !== true) {
        done += 1;
        if (done % chunkSize === 0) {
            onProgress({ done: toCount(done), total });
            await nextTurn();
        }
        step = restoring.next();
    }
    onProgress({ done: total, total });
    return step.value;
}
