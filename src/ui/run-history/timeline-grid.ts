import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import type { IBranchLine } from '../../application-core/simulation-engine/run-branches';
import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import type { Position } from '../../domain/system/math/math';
import { toPosition } from '../../domain/system/math/math';
import { changedModules, StateModule } from '../../application-core/run-history/run-query';
import type { IRunIndex } from '../../application-core/simulation-engine/run-index';
import {
    EMPTY_RUN_INDEX,
    indexOfCommits,
} from '../../application-core/simulation-engine/run-index';
import type { SessionId } from '../../application-core/simulation-engine/session-id';
import type { ISubjectsOfCommit, SubjectId } from './timeline-subjects';
import { SubjectKind, SubjectWalk } from './timeline-subjects';

/**
 * The timeline as a grid (FND-81, FND-87): a column for each branch, holding its own commits, and
 * rows that line up across the columns, in groups that open and close across every column at
 * once. These plain functions work it out from the commits; nothing about it is saved.
 */

/**
 * The timeline's views over the same commits (FND-81): how rows group and line up across the
 * columns. A commit can sit in more than one view, and under more than one order or driver.
 */
export const TimelineView = {
    /** Commits at the same simulated time share a band, under hours and minutes. */
    ByTime: 'ByTime',
    /** Each branch's nth job run or API call shares rows, under hundreds and tens of them. */
    ByNumber: 'ByNumber',
    /** Each order's job runs and API calls, each shown whole, then its commits in time order. */
    ByOrder: 'ByOrder',
    /** Each driver's job runs and API calls, each shown whole, then its commits in time order. */
    ByDriver: 'ByDriver',
} as const;

/** One of the values of {@link TimelineView}. */
export type TimelineView = (typeof TimelineView)[keyof typeof TimelineView];

/** What the views by order and by driver group by; null for the views by time and by number. */
const SUBJECT_OF_VIEW: Readonly<Record<TimelineView, SubjectKind | null>> = {
    [TimelineView.ByTime]: null,
    [TimelineView.ByNumber]: null,
    [TimelineView.ByOrder]: SubjectKind.Order,
    [TimelineView.ByDriver]: SubjectKind.Driver,
};

/** What a node of the grid is. */
export const NodeKind = {
    Hour: 'Hour',
    Minute: 'Minute',
    Hundred: 'Hundred',
    Ten: 'Ten',
    /** An order, in the view by order: the job runs and API calls that touched it. */
    Order: 'Order',
    /** A driver, in the view by driver: the job runs and API calls that touched them. */
    Driver: 'Driver',
    /** A job run or API call: the commits made during it. */
    Session: 'Session',
    /** Back-to-back empty job runs, collapsed into one row (FND-81). */
    EmptyRuns: 'EmptyRuns',
    /** The empty runs of one job, inside collapsed empty job runs. */
    JobRuns: 'JobRuns',
    /** A row stating a gap in simulated time, which no grid holds, only the rows drawn. */
    Gap: 'Gap',
    /** One commit in each column that has one there. */
    Commit: 'Commit',
} as const;

/** One of the values of {@link NodeKind}. */
export type NodeKind = (typeof NodeKind)[keyof typeof NodeKind];

/** Where a fork's line leaves another column's: the last commit it shares there. */
export interface IForkJoin {
    readonly column: BranchId;
    readonly place: Position;
}

/** A branch's column. */
export interface ITimelineColumn {
    readonly id: BranchId;
    readonly name: string;
    readonly isCurrent: boolean;
    readonly forkedFrom: BranchId | null;
    /** Its place in the order branches were made, from 0 for Main, which sets its colour. */
    readonly made: number;
    /** The commit its line leaves another column's at; null for Main or a fork from the start. */
    readonly join: IForkJoin | null;
}

/** A commit in its column, with its place on its branch's line, counted from 1. */
export interface IGridCommit {
    readonly column: BranchId;
    readonly place: Position;
    readonly commit: ICommit;
    /** For a state commit, the module it changed, from its root against the one before. */
    readonly module: TimelineModule | null;
    /**
     * The module that called it: the one the commit before changed, in the same job run or API
     * call, when that was another module (FND-87).
     */
    readonly calledFrom: TimelineModule | null;
}

/** The modules a state commit can change, as the timeline names them. */
export const TimelineModule = StateModule;

/** One of the values of {@link TimelineModule}. */
export type TimelineModule = StateModule;

/**
 * The module a state commit changed: the part of the state root that is not the one before's.
 * Deliveries is part of Drivers, so a change to both is a Deliveries change.
 */
function moduleChanged(commit: ICommit, before: IMainRoot): TimelineModule | null {
    if (commit.kind !== CommitKind.State) {
        return null;
    }
    const changed = changedModules(before, commit.root);
    return changed[0] ?? null;
}

/** A group or a commit of the grid, the same in every column. */
export interface ITimelineNode {
    /** Unique in the grid, and the same while the commits under it stay the same. */
    readonly key: string;
    readonly kind: NodeKind;
    readonly label: string;
    /** For an order's or a driver's group, its ID; null for every other node. */
    readonly subject: SubjectId | null;
    readonly children: readonly ITimelineNode[];
    /** Each column's commits under it, oldest first; a column with none is left out. */
    readonly commits: ReadonlyMap<BranchId, readonly IGridCommit[]>;
    /**
     * Every commit under it, the ones the filter hides too, when it hides some: what finds the
     * group holding a hidden commit. Left out, it is `commits`.
     */
    readonly held?: ReadonlyMap<BranchId, readonly IGridCommit[]>;
}

/** The columns, and the top level of the groups. */
export interface ITimelineGrid {
    readonly columns: readonly ITimelineColumn[];
    readonly nodes: readonly ITimelineNode[];
}

/** One row as shown, given which nodes are open. */
export interface ITimelineRow {
    readonly node: ITimelineNode;
    readonly depth: number;
    /** For one of an open commit's events, its index in each column's commit; else null. */
    readonly entry: number | null;
}

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR;
const HUNDRED = 100;
const TEN = 10;
const SPANS: ReadonlySet<NodeKind> = new Set([
    NodeKind.Hour,
    NodeKind.Minute,
    NodeKind.Hundred,
    NodeKind.Ten,
]);
const UNDER_WAY = 'Job run or API call, under way';

/** One step of the path from the top of the grid down to a commit. */
interface ISegment {
    readonly key: string;
    readonly kind: NodeKind;
    readonly label: string;
    /** Sorts the nodes at one level, compared number by number. */
    readonly order: readonly number[];
    /** For an order's or a driver's group, its ID. */
    readonly subject?: SubjectId;
}

/** What walking a line has counted so far. */
interface ICounts {
    sessions: number;
    loneSinceSession: number;
    readonly itemsAt: Map<number, number>;
    readonly sessionsSeen: Map<string, ISegment>;
    readonly commitsIn: Map<string, number>;
}

const pad = (value: number): string => String(value).padStart(2, '0');

function hourSegment(at: number): ISegment {
    const hour = Math.floor(at / MS_PER_HOUR);
    return { key: `h${hour}`, kind: NodeKind.Hour, label: `h${pad(hour)}`, order: [hour] };
}

function minuteSegment(at: number): ISegment {
    const minute = Math.floor(at / MS_PER_MINUTE);
    const hour = Math.floor(minute / MINUTES_PER_HOUR);
    const label = `h${pad(hour)}:m${pad(minute % MINUTES_PER_HOUR)}`;
    return { key: `m${minute}`, kind: NodeKind.Minute, label, order: [minute] };
}

/** The block of a size that the nth job run or API call falls in, such as 41–50. */
function blockSegment(number: number, size: number, kind: NodeKind, prefix: string): ISegment {
    const block = Math.floor((Math.max(number, 1) - 1) / size);
    const first = block * size + 1;
    const last = first + size - 1;
    return { key: `${kind}${block}`, kind, label: `${prefix}${first}–${last}`, order: [block] };
}

/** The spans above whatever is at a time, or after the nth job run or API call. */
function spansOf(mode: TimelineView, at: number, number: number): readonly ISegment[] {
    if (mode === TimelineView.ByOrder || mode === TimelineView.ByDriver) {
        return [];
    }
    if (mode === TimelineView.ByTime) {
        return [hourSegment(at), minuteSegment(at)];
    }
    const hundred = blockSegment(number, HUNDRED, NodeKind.Hundred, 'Job runs and calls ');
    const ten = blockSegment(number, TEN, NodeKind.Ten, '');
    return [hundred, ten];
}

/** The next thing at a time on a line, counted from 0, so things at the same time line up. */
function nextAt(counts: ICounts, at: number): number {
    const ordinal = counts.itemsAt.get(at) ?? 0;
    counts.itemsAt.set(at, ordinal + 1);
    return ordinal;
}

/** A job run's or API call's segment, the first time one of its commits is met. */
function newSession(counts: ICounts, mode: TimelineView, at: number): ISegment {
    counts.sessions += 1;
    counts.loneSinceSession = 0;
    const number = counts.sessions;
    if (mode === TimelineView.ByNumber) {
        return { key: `n${number}`, kind: NodeKind.Session, label: '', order: [number, 0] };
    }
    const ordinal = nextAt(counts, at);
    return { key: `s${at}.${ordinal}`, kind: NodeKind.Session, label: '', order: [at, ordinal] };
}

/** A commit made outside any job run or API call, such as a config change. */
function loneSegment(counts: ICounts, mode: TimelineView, at: number): ISegment {
    counts.loneSinceSession += 1;
    if (mode === TimelineView.ByNumber) {
        const { sessions, loneSinceSession } = counts;
        const key = `l${sessions}.${loneSinceSession}`;
        return { key, kind: NodeKind.Commit, label: '', order: [sessions, loneSinceSession] };
    }
    const ordinal = nextAt(counts, at);
    return { key: `l${at}.${ordinal}`, kind: NodeKind.Commit, label: '', order: [at, ordinal] };
}

/**
 * One commit's path down to it: the spans above it, then its job run or API call and its place
 * there, or, made outside one, its own place. By order and by driver, there are no spans, and an
 * order or a driver goes above the rest.
 */
interface IPath {
    readonly spans: readonly ISegment[];
    readonly rest: readonly ISegment[];
}

/** One commit's path, from the top of the grid down to it. */
function pathOf(counts: ICounts, mode: TimelineView, commit: ICommit): IPath {
    const { session } = commit;
    const at = commit.at.milliseconds;
    if (session === null) {
        const lone = loneSegment(counts, mode, at);
        const spans = spansOf(mode, at, counts.sessions);
        return { spans, rest: [lone] };
    }
    const known = counts.sessionsSeen.get(session);
    const group = known ?? newSession(counts, mode, at);
    counts.sessionsSeen.set(session, group);
    const ordinal = counts.commitsIn.get(session) ?? 0;
    counts.commitsIn.set(session, ordinal + 1);
    const slot: ISegment = {
        key: `c${ordinal}`,
        kind: NodeKind.Commit,
        label: '',
        order: [ordinal],
    };
    // By number, a job run's first number is its own; by time, all its commits share a time.
    const [number = 0] = group.order;
    const spans = spansOf(mode, at, number);
    return { spans, rest: [group, slot] };
}

/** Nothing counted yet. */
const noCounts = (): ICounts => ({
    sessions: 0,
    loneSinceSession: 0,
    itemsAt: new Map(),
    sessionsSeen: new Map(),
    commitsIn: new Map(),
});

/**
 * The branches laid out as a tree (FND-87): each branch between its forks, which alternate sides
 * in the order they were made, the first to the right, so the earliest stay nearest it. Each
 * fork's own forks are laid out around it the same way.
 */
function inTreeLayout(branches: readonly IBranchLine[]): readonly IBranchLine[] {
    const around = (branch: IBranchLine): readonly IBranchLine[] => {
        const forks = branches.filter((other) => other.forkedFrom === branch.id);
        const right = forks.filter((_, index) => index % 2 === 0).flatMap(around);
        const leftNearestFirst = forks.filter((_, index) => index % 2 === 1);
        const left = [...leftNearestFirst].reverse().flatMap(around);
        return [...left, branch, ...right];
    };
    const roots = branches.filter((branch) => branch.forkedFrom === null);
    return roots.flatMap(around);
}

/** The column holding a branch's commit at a place: its own, or an ancestor's it shares. */
function ownerOf(
    byId: ReadonlyMap<BranchId, IBranchLine>,
    branch: IBranchLine,
    place: Position,
): BranchId {
    const parent = branch.forkedFrom === null ? undefined : byId.get(branch.forkedFrom);
    if (parent === undefined || place > branch.forkedAt) {
        return branch.id;
    }
    return ownerOf(byId, parent, place);
}

function columnOf(
    byId: ReadonlyMap<BranchId, IBranchLine>,
    branch: IBranchLine,
    made: number,
): ITimelineColumn {
    const parent = branch.forkedFrom === null ? undefined : byId.get(branch.forkedFrom);
    const hasJoin = parent !== undefined && branch.forkedAt > 0;
    const join = hasJoin
        ? { column: ownerOf(byId, parent, branch.forkedAt), place: branch.forkedAt }
        : null;
    return {
        id: branch.id,
        name: branch.name,
        isCurrent: branch.isCurrent,
        forkedFrom: branch.forkedFrom,
        made,
        join,
    };
}

function compareOrders(first: readonly number[], second: readonly number[]): number {
    const length = Math.max(first.length, second.length);
    const differing = Array.from({ length }, (_, index) => {
        const one = first[index] ?? 0;
        const other = second[index] ?? 0;
        return one - other;
    });
    return differing.find((difference) => difference !== 0) ?? 0;
}

/** What a job run or API call is, from its effect commit in each column. */
function sessionLabel(commits: ReadonlyMap<BranchId, readonly IGridCommit[]>): string {
    const labels = [...commits.values()].flatMap((own) =>
        own.flatMap(({ commit }) => {
            const { effect } = commit;
            if (effect?.kind === EffectKind.Job) {
                return [`Job run: ${effect.job}`];
            }
            if (effect?.kind === EffectKind.Input) {
                return [`API call: ${effect.command}`];
            }
            return [];
        }),
    );
    const distinct = [...new Set(labels)];
    return distinct.length === 0 ? UNDER_WAY : distinct.join(' / ');
}

/**
 * A node of the grid as it grows. Its children are sorted, and its label worked out, only when
 * asked for, and again only after something under it changed, so a run as long as a city day
 * costs only what is shown.
 */
class GridNode implements ITimelineNode {
    private readonly childNodes = new Map<string, GridNode>();
    private readonly ownCommits = new Map<BranchId, IGridCommit[]>();
    private sorted: readonly ITimelineNode[] | null = null;
    private named: string | null = null;

    get kind(): NodeKind {
        return this.segment.kind;
    }

    get label(): string {
        if (this.named === null) {
            this.named =
                this.kind === NodeKind.Session
                    ? sessionLabel(this.ownCommits)
                    : this.segment.label;
        }
        return this.named;
    }

    get commits(): ReadonlyMap<BranchId, readonly IGridCommit[]> {
        return this.ownCommits;
    }

    get subject(): SubjectId | null {
        return this.segment.subject ?? null;
    }

    /** Its children in order, each span with only one thing in it skipped. */
    get children(): readonly ITimelineNode[] {
        if (this.sorted === null) {
            const nodes = [...this.childNodes.values()].sort((first, second) =>
                compareOrders(first.segment.order, second.segment.order),
            );
            this.sorted = nodes.map((node) => node.shown());
        }
        return this.sorted;
    }

    constructor(
        readonly key: string,
        private readonly segment: ISegment,
    ) {}

    /** Adds a commit to this node, and below it down its path. */
    add(path: readonly ISegment[], gridCommit: IGridCommit): void {
        this.named = null;
        const own = this.ownCommits.get(gridCommit.column) ?? [];
        this.ownCommits.set(gridCommit.column, own);
        own.push(gridCommit);
        this.addBelow(path, gridCommit);
    }

    /**
     * Adds a commit below this node, down its path, without holding it itself, as the top of the
     * grid does: there a commit under several orders would be held more than once.
     */
    addBelow(path: readonly ISegment[], gridCommit: IGridCommit): void {
        this.sorted = null;
        const [next, ...rest] = path;
        if (next === undefined) {
            return;
        }
        const key = `${this.key}/${next.key}`;
        const child = this.childNodes.get(key) ?? new GridNode(key, next);
        this.childNodes.set(key, child);
        child.add(rest, gridCommit);
    }

    /** The node shown in its place: its one child, for a span with only one thing in it. */
    private shown(): ITimelineNode {
        // Only a span with one thing in it looks below itself, so listing a level sorts only it.
        if (!SPANS.has(this.kind) || this.childNodes.size !== 1) {
            return this;
        }
        const [only] = this.children;
        return only ?? this;
    }
}

/** A commit of the job run or API call under way, and its path below an order or a driver. */
interface IPlaced {
    readonly rest: readonly ISegment[];
    readonly gridCommit: IGridCommit;
}

/** How far the grid has taken in a branch's line, and what it counted on the way. */
interface IWalked {
    readonly counts: ICounts;
    size: number;
    /** The last commit walked, and the module it changed, which the next is told apart from. */
    last: { readonly commit: ICommit; readonly module: TimelineModule | null } | null;
    /** By order or by driver, what each commit goes under; null in the other views. */
    readonly subjects: SubjectWalk | null;
    /** By order or by driver, the branch's own commits of the job run or API call under way. */
    work: { readonly session: SessionId | null; readonly placed: IPlaced[] };
}

/** The index of a branch's line: the run's own for the current branch, or worked out. */
function indexOfBranch(branch: IBranchLine): IRunIndex {
    if (branch.index !== null) {
        return branch.index;
    }
    const root = branch.line.last()?.root ?? branch.start;
    return indexOfCommits(branch.line, root);
}

/** The module a commit changed, and the one that called it, against the commit before. */
function modulesOf(
    walked: IWalked,
    branch: IBranchLine,
    commit: ICommit,
): Pick<IGridCommit, 'module' | 'calledFrom'> {
    const { last } = walked;
    const before = last?.commit.root ?? branch.start;
    const module = moduleChanged(commit, before);
    const isSameWork = last !== null && last.commit.session === commit.session;
    const isCall = isSameWork && module !== null && last.module !== null && last.module !== module;
    walked.last = { commit, module };
    return { module, calledFrom: isCall ? last.module : null };
}

/**
 * The grid of every branch's commits, in one view: a column for each branch laid out as a tree,
 * and the groups that line its commits up with the other branches'. It takes in each branch's new
 * commits as the run goes, as a line only ever grows.
 */
export class TimelineGrid implements ITimelineGrid {
    private readonly top = new GridNode('', {
        key: '',
        kind: NodeKind.Hour,
        label: '',
        order: [],
    });
    private readonly walked = new Map<BranchId, IWalked>();
    /** Each order's or driver's group, by its ID, in the order they were first met. */
    private readonly subjectSegments = new Map<SubjectId, ISegment>();
    private readonly subjectKind: SubjectKind | null;
    private shownColumns: readonly ITimelineColumn[] = [];

    get columns(): readonly ITimelineColumn[] {
        return this.shownColumns;
    }

    /** The top level of the groups. */
    get nodes(): readonly ITimelineNode[] {
        return this.top.children;
    }

    constructor(readonly view: TimelineView) {
        this.subjectKind = SUBJECT_OF_VIEW[view];
    }

    /** Takes in the branches as they are now: their names, and the commits not taken in yet. */
    update(branches: readonly IBranchLine[]): void {
        const ordered = inTreeLayout(branches);
        const pairs = ordered.map((branch) => [branch.id, branch] as const);
        const byId = new Map(pairs);
        this.shownColumns = ordered.map((branch) => {
            const made = branches.indexOf(branch);
            return columnOf(byId, branch, made);
        });
        ordered.forEach((branch) => {
            this.takeIn(branch);
        });
    }

    /**
     * Walks a branch's line from where it stopped. It counts the shared commits too, so a fork's
     * own job runs line up with its parent's, but adds only the branch's own.
     */
    private takeIn(branch: IBranchLine): void {
        const walked = this.walkOf(branch.id);
        const from = walked.size;
        if (from >= branch.line.size) {
            return;
        }
        // By order and by driver, a branch other than the current one has its index worked out.
        const index = walked.subjects === null ? EMPTY_RUN_INDEX : indexOfBranch(branch);
        branch.line.slice(from).forEach((commit, offset) => {
            const { spans, rest } = pathOf(walked.counts, this.view, commit);
            const modules = modulesOf(walked, branch, commit);
            const met = walked.subjects?.take(commit, index) ?? null;
            const at = from + offset;
            if (at < branch.forkedAt) {
                return;
            }
            const place = toPosition(at + 1);
            const gridCommit: IGridCommit = { column: branch.id, place, commit, ...modules };
            if (met === null) {
                this.top.addBelow([...spans, ...rest], gridCommit);
                return;
            }
            this.addUnderSubjects(walked, met, { rest, gridCommit });
        });
        walked.size = branch.line.size;
    }

    private walkOf(id: BranchId): IWalked {
        const known = this.walked.get(id);
        if (known !== undefined) {
            return known;
        }
        const kind = this.subjectKind;
        const walked: IWalked = {
            counts: noCounts(),
            size: 0,
            last: null,
            subjects: kind === null ? null : new SubjectWalk(kind),
            work: { session: null, placed: [] },
        };
        this.walked.set(id, walked);
        return walked;
    }

    /**
     * Adds a commit under each order or driver it goes under. One first met at this commit also
     * takes the earlier commits of its job run or API call, as a job run is shown whole.
     */
    private addUnderSubjects(walked: IWalked, met: ISubjectsOfCommit, placed: IPlaced): void {
        const { commit } = placed.gridCommit;
        const { session } = commit;
        if (session !== walked.work.session) {
            walked.work = { session, placed: [] };
        }
        const earlier = [...walked.work.placed];
        if (session !== null) {
            walked.work.placed.push(placed);
        }
        met.subjects.forEach((subject, order) => {
            const segment = this.subjectSegment(subject, commit.at.milliseconds);
            const commits = order >= met.firstMet ? [...earlier, placed] : [placed];
            commits.forEach(({ rest, gridCommit }) => {
                this.top.addBelow([segment, ...rest], gridCommit);
            });
        });
    }

    /** An order's or a driver's group, made the first time it is met, in that order. */
    private subjectSegment(subject: SubjectId, at: number): ISegment {
        const known = this.subjectSegments.get(subject);
        if (known !== undefined) {
            return known;
        }
        const isOrder = this.subjectKind === SubjectKind.Order;
        const segment: ISegment = {
            key: `${isOrder ? 'o' : 'd'}:${subject}`,
            kind: isOrder ? NodeKind.Order : NodeKind.Driver,
            label: `${isOrder ? 'Order' : 'Driver'} ${subject}`,
            order: [at, this.subjectSegments.size],
            subject,
        };
        this.subjectSegments.set(subject, segment);
        return segment;
    }
}

/**
 * The grid of every branch's commits, in one view, as it stands: a run as it goes keeps one
 * {@link TimelineGrid} and updates it instead.
 */
export function timelineGrid(branches: readonly IBranchLine[], view: TimelineView): TimelineGrid {
    const grid = new TimelineGrid(view);
    grid.update(branches);
    return grid;
}

/** Whether a node is open: by its key, or by its kind as a zoom level opens them. */
export type IsOpen = (node: ITimelineNode) => boolean;

/** How many events the busiest column's commit at a node holds. */
function eventsAt(node: ITimelineNode): number {
    const counts = [...node.commits.values()].map((own) => {
        const [first] = own;
        return first?.commit.entries.size ?? 0;
    });
    return Math.max(0, ...counts);
}

/**
 * The rows shown, given which nodes are open: each node's own row, then, when it is open, its
 * children's rows, or for a commit, a row for each of its events.
 */
export function timelineRows(
    nodes: readonly ITimelineNode[],
    open: Pick<ReadonlySet<string>, 'has'> | IsOpen,
    depth = 0,
): readonly ITimelineRow[] {
    const isOpen: IsOpen =
        typeof open === 'function' ? open : (node): boolean => open.has(node.key);
    return nodes.flatMap((node) => {
        const row: ITimelineRow = { node, depth, entry: null };
        if (!isOpen(node)) {
            return [row];
        }
        if (node.kind === NodeKind.Commit) {
            const count = eventsAt(node);
            const events = Array.from({ length: count }, (_, entry) => ({
                node,
                depth: depth + 1,
                entry,
            }));
            return [row, ...events];
        }
        const below = timelineRows(node.children, isOpen, depth + 1);
        return [row, ...below];
    });
}

/**
 * How far each column holds a branch's line: its own column all the way, and each column it
 * shares commits with up to the last commit shared. A fork's commits before its fork point are in
 * its parent's column, so its line runs through it.
 */
export function lineThrough(
    columns: readonly ITimelineColumn[],
    branch: BranchId,
): ReadonlyMap<BranchId, number> {
    const pairs = columns.map((column) => [column.id, column] as const);
    const byId = new Map(pairs);
    const through = new Map<BranchId, number>();
    const walk = (id: BranchId, upTo: number): void => {
        through.set(id, upTo);
        const join = byId.get(id)?.join ?? null;
        if (join !== null) {
            const shared = Math.min(upTo, join.place);
            walk(join.column, shared);
        }
    };
    walk(branch, Number.POSITIVE_INFINITY);
    return through;
}

/** The column holding a branch's commit at a place: its own, or the one it shares it with. */
export function columnHolding(
    columns: readonly ITimelineColumn[],
    branch: BranchId,
    place: Position,
): BranchId {
    const through = lineThrough(columns, branch);
    const holding = [...through.entries()].filter(([, upTo]) => place <= upTo);
    // The furthest one up the tree that still holds it: shared commits are shown only there.
    const last = holding.at(-1);
    return last?.[0] ?? branch;
}

/**
 * Whether a column's commits, oldest first, hold the one at a place. By time and by number a
 * group's commits run on, but under an order or a driver they skip the others', so it searches.
 */
export function holdsPlace(own: readonly IGridCommit[] | undefined, place: Position): boolean {
    if (own === undefined) {
        return false;
    }
    let low = 0;
    let high = own.length - 1;
    while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const found = own[middle]?.place ?? place;
        if (found === place) {
            return true;
        }
        if (found < place) {
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    return false;
}

/** Whether a node holds a column's commit at a place, shown or hidden by the filter. */
function holds(node: ITimelineNode, column: BranchId, place: Position): boolean {
    const all = node.held ?? node.commits;
    const own = all.get(column);
    return holdsPlace(own, place);
}

/**
 * The groups holding a column's commit at a place, from the top down, so the group holding the
 * commit shown can be opened.
 */
export function groupsHolding(
    nodes: readonly ITimelineNode[],
    column: BranchId,
    place: Position,
): readonly ITimelineNode[] {
    const found = nodes.find(
        (node) => node.kind !== NodeKind.Commit && holds(node, column, place),
    );
    if (found === undefined) {
        return [];
    }
    const below = groupsHolding(found.children, column, place);
    return [found, ...below];
}

/** The keys of the groups holding a column's commit at a place, from the top down. */
export function keysHolding(
    nodes: readonly ITimelineNode[],
    column: BranchId,
    place: Position,
): readonly string[] {
    const groups = groupsHolding(nodes, column, place);
    return groups.map((group) => group.key);
}

/** The commit node of a column's commit at a place, if the grid holds it. */
export function commitNodeAt(
    nodes: readonly ITimelineNode[],
    column: BranchId,
    place: Position,
): ITimelineNode | undefined {
    const found = nodes.find((node) => holds(node, column, place));
    if (found === undefined || found.kind === NodeKind.Commit) {
        return found;
    }
    return commitNodeAt(found.children, column, place);
}
