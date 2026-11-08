import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import type { Position } from '../../domain/system/math/math';
import type { IGridCommit, IsOpen, ITimelineColumn, ITimelineRow } from './timeline-grid';
import type { TimelineModule } from './timeline-grid';
import { NodeKind, RowMode } from './timeline-grid';
import type { IUnaware } from './unaware-spans';
import { UnawarePart, unawareRows } from './unaware-spans';
import { choiceOf } from './indirect-effect-form/indirect-statement';

/**
 * How far in the timeline is zoomed (FND-87): which groups start open. By time the levels are
 * hours, minutes, and commits; by number, hundreds, tens, and commits.
 */
export const TimelineZoom = {
    /** Only the top groups: hours, or hundreds of job runs and API calls. */
    Top: 'Top',
    /** The top groups open, showing theirs: minutes, or tens. */
    Middle: 'Middle',
    /** Every group open, down to the commits. */
    Commits: 'Commits',
} as const;

/** One of the values of {@link TimelineZoom}. */
export type TimelineZoom = (typeof TimelineZoom)[keyof typeof TimelineZoom];

/** What each zoom level is called in a mode. */
export function zoomLabel(zoom: TimelineZoom, mode: RowMode): string {
    if (zoom === TimelineZoom.Commits) {
        return 'Commits';
    }
    const isTop = zoom === TimelineZoom.Top;
    if (mode === RowMode.ByTime) {
        return isTop ? 'Hours' : 'Minutes';
    }
    return isTop ? 'Hundreds' : 'Tens';
}

/** Whether a zoom level opens a kind of group. */
export function opensAt(zoom: TimelineZoom, kind: NodeKind): boolean {
    if (zoom === TimelineZoom.Commits) {
        return kind !== NodeKind.Commit;
    }
    return zoom === TimelineZoom.Middle && (kind === NodeKind.Hour || kind === NodeKind.Hundred);
}

/** A branch's column heading: its name, where it came from, and what its controls do. */
export interface IColumnHeading {
    readonly id: BranchId;
    readonly name: string;
    readonly origin: string;
    readonly isCurrent: boolean;
    /** Which of the lane colours its branch takes. */
    readonly colour: number;
    readonly watchLabel: string;
    readonly renameLabel: string;
}

/**
 * How a cell draws its branch's lane, as a git graph does: a line down the column from where the
 * branch starts, and at a fork point a line from the parent's commit, across any columns between,
 * turning down into the fork's lane (FND-87).
 */
export interface ILane {
    /** The branch's line runs down through this row. */
    readonly isOn: boolean;
    /** The branch forks off here, from a parent to its left: its line comes in from the left. */
    readonly isStartFromLeft: boolean;
    /** The branch forks off here, from a parent to its right: its line comes in from the right. */
    readonly isStartFromRight: boolean;
    /** A fork's line leaves this column's commit here, towards a fork on its left. */
    readonly isLeavingLeft: boolean;
    /** A fork's line leaves this column's commit here, towards a fork on its right. */
    readonly isLeavingRight: boolean;
    /** A fork's line crosses this column here, on its way to the fork. */
    readonly isCrossed: boolean;
    /** Which of the lane colours the branch takes, so branches are told apart. */
    readonly colour: number;
    /** The colour of the fork whose line leaves or crosses here, so it can be followed. */
    readonly crossing: number | null;
}

/** How many colours the lanes take in turn. */
export const LANE_COLOURS = 5;

const NO_LANE: ILane = {
    isOn: false,
    isStartFromLeft: false,
    isStartFromRight: false,
    isLeavingLeft: false,
    isLeavingRight: false,
    isCrossed: false,
    colour: 0,
    crossing: null,
};

/** What one cell of a row shows. */
export interface ITimelineCell {
    readonly column: BranchId;
    /** The commit's place on its branch's line, for a commit or one of its events. */
    readonly place: Position | null;
    /** The log entry it selects: one of a commit's events, or a commit's first. */
    readonly sequence: number | null;
    /** For one of a commit's events, its kind, which a breakpoint can pause at (FND-88). */
    readonly eventKind: string | null;
    readonly text: string;
    /** The kind of commit, which marks it, or null for a group or an event. */
    readonly mark: CommitKind | null;
    /** On the branch watched, after the commit shown: it had not happened yet (FND-86). */
    readonly isLater: boolean;
    /** The commit shown, on the branch watched. */
    readonly isShown: boolean;
    /** The event selected, on the branch watched. */
    readonly isSelected: boolean;
    /** The forks that leave this commit, by name. */
    readonly forks: readonly string[];
    /** For a fork's first commit, where its line came from. */
    readonly from: string | null;
    /**
     * A commit a fork can start at: one that ends a job run or API call, or is made outside one,
     * as forks start between them (FND-87).
     */
    readonly isForkPoint: boolean;
    /** For a closed group, how many of the column's commits it holds, drawn as a summary node. */
    readonly count: number;
    /** A group holding the commit shown, on the branch watched, so it is found when zoomed out. */
    readonly hasShown: boolean;
    /** For a state commit, the module it changed, shown as a badge (FND-87). */
    readonly module: TimelineModule | null;
    /** For a state commit called from another module in its job run or API call, that module. */
    readonly calledFrom: TimelineModule | null;
    /** The next commit, in the same job run or API call, is a call to another module. */
    readonly isCalling: boolean;
    readonly tooltip: string;
    readonly lane: ILane;
    /** Its part of a span the service was unaware of an indirect effect, or null (FND-89). */
    readonly unaware: IUnaware | null;
}

/** One row as the timeline panel draws it. */
export interface ITimelineRowView {
    /** Unique among the rows: a node's key, with an event's index for one of its events. */
    readonly id: string;
    /** The node's key, which opens and closes it. */
    readonly key: string;
    readonly kind: NodeKind;
    readonly depth: number;
    readonly label: string;
    readonly isEvent: boolean;
    /** A fork's connector row, where its line curves off its parent and into its own lane. */
    readonly isConnector: boolean;
    readonly canOpen: boolean;
    readonly isOpen: boolean;
    readonly cells: readonly ITimelineCell[];
}

/** Where the run is, which the rows are drawn against. */
export interface ITimelineContext {
    readonly currentBranch: BranchId;
    /** How far each column holds the watched branch's line, from {@link lineThrough}. */
    readonly line: ReadonlyMap<BranchId, number>;
    readonly place: Position;
    readonly selected: number | null;
    readonly isOpen: IsOpen;
}

const NO_SPANS: ReadonlyMap<BranchId, IUnaware> = new Map();
const MIDDLE: IUnaware = { part: UnawarePart.Middle, text: null };

const commitsText = (count: number): string => (count === 1 ? '1 commit' : `${count} commits`);

/** The headings of the columns, with what their controls do (FND-87). */
export function columnHeadings(columns: readonly ITimelineColumn[]): readonly IColumnHeading[] {
    const pairs = columns.map((column) => [column.id, column.name] as const);
    const names = new Map(pairs);
    return columns.map((column) => {
        const parent = column.forkedFrom === null ? undefined : names.get(column.forkedFrom);
        const at = column.join === null ? 'the start' : `commit ${column.join.place}`;
        const origin = parent === undefined ? 'The first branch' : `From ${parent} at ${at}`;
        return {
            id: column.id,
            name: column.name,
            origin,
            isCurrent: column.isCurrent,
            colour: column.made % LANE_COLOURS,
            watchLabel: column.isCurrent
                ? `Watching ${column.name}`
                : `Watch ${column.name}, at its latest commit`,
            renameLabel: `Rename ${column.name}`,
        };
    });
}

/** What a commit did, in a word or two: its first event, or what its effect was. */
function commitText(commit: ICommit): string {
    if (commit.indirect !== null) {
        return choiceOf(commit.indirect.kind).label;
    }
    const first = commit.entries.first();
    if (first !== undefined) {
        return first.kind;
    }
    const { effect } = commit;
    if (effect === null) {
        return 'No events';
    }
    if (effect.kind === CommitKind.Job) {
        return effect.job;
    }
    if (effect.kind === CommitKind.Input) {
        return effect.command;
    }
    return 'Config change';
}

const emptyCell = (column: BranchId, text: string): ITimelineCell => ({
    column,
    place: null,
    sequence: null,
    eventKind: null,
    text,
    mark: null,
    isLater: false,
    isShown: false,
    isSelected: false,
    forks: [],
    from: null,
    isForkPoint: false,
    count: 0,
    hasShown: false,
    module: null,
    calledFrom: null,
    isCalling: false,
    tooltip: '',
    lane: NO_LANE,
    unaware: null,
});

/** The forks that leave a commit, and, for a fork's first commit, where its line came from. */
function joinsAt(
    columns: readonly ITimelineColumn[],
    column: BranchId,
    place: Position,
): { readonly forks: readonly string[]; readonly from: string | null } {
    const leaving = columns.filter(
        (other) => other.join?.column === column && other.join.place === place,
    );
    const forks = leaving.map((other) => other.name);
    const join = columns.find((other) => other.id === column)?.join ?? null;
    if (join === null || place !== join.place + 1) {
        return { forks, from: null };
    }
    const parent = columns.find((other) => other.id === join.column);
    const from = `from ${parent?.name ?? 'its parent'} #${join.place}`;
    return { forks, from };
}

/** One of a commit's events, in its column. */
function eventCell(
    gridCommit: IGridCommit,
    context: ITimelineContext,
    entry: number,
): ITimelineCell {
    const { column, place, commit } = gridCommit;
    const logEntry = commit.entries.get(entry);
    if (logEntry === undefined) {
        return emptyCell(column, '');
    }
    const isWatched = isOnLine(context, column, place);
    return {
        ...emptyCell(column, `#${logEntry.sequence} ${logEntry.kind}`),
        place,
        sequence: logEntry.sequence,
        eventKind: logEntry.kind,
        isLater: isWatched && place > context.place,
        isSelected: isWatched && logEntry.sequence === context.selected,
        tooltip: `Select event #${logEntry.sequence} to see its payload`,
    };
}

/**
 * A group's cell in a column: a summary node with how many of the column's commits it holds, and
 * whether one of them is the commit shown.
 */
/**
 * What a closed group says about the calls between modules it holds: a job run's or API call's
 * path through the modules, such as Orders → Deliveries → Orders, or how many calls a span holds.
 */
function callsText(kind: NodeKind, own: readonly IGridCommit[]): string {
    if (kind === NodeKind.Session) {
        const modules = own.flatMap((gridCommit) =>
            gridCommit.module === null ? [] : [gridCommit.module],
        );
        const path = modules.filter((module, index) => module !== modules[index - 1]);
        return path.length > 1 ? ` · ${path.join(' → ')}` : '';
    }
    const calls = own.filter((gridCommit) => gridCommit.calledFrom !== null).length;
    if (calls === 0) {
        return '';
    }
    return calls === 1 ? ' · 1 call' : ` · ${calls} calls`;
}

function summaryCell(
    column: BranchId,
    own: readonly IGridCommit[],
    context: ITimelineContext,
    kind: NodeKind,
): ITimelineCell {
    const first = own[0]?.place;
    const last = own.at(-1)?.place;
    const hasShown =
        first !== undefined &&
        last !== undefined &&
        isOnLine(context, column, context.place) &&
        first <= context.place &&
        context.place <= last;
    const calls = callsText(kind, own);
    const text = own.length === 0 ? '' : `${commitsText(own.length)}${calls}`;
    return { ...emptyCell(column, text), count: own.length, hasShown };
}

/** Whether a column's commit at a place is on the line of the branch watched. */
function isOnLine(context: ITimelineContext, column: BranchId, place: Position): boolean {
    const upTo = context.line.get(column);
    return upTo !== undefined && place <= upTo;
}

/** A commit, in its column: a root of the run's DAG (FND-81), marked if a fork can start there. */
function commitCell(
    gridCommit: IGridCommit,
    columns: readonly ITimelineColumn[],
    context: ITimelineContext,
): ITimelineCell {
    const { column, place, commit } = gridCommit;
    const isWatched = isOnLine(context, column, place);
    const { forks, from } = joinsAt(columns, column, place);
    const time = formatClockTime(commit.at.milliseconds);
    const what = commitText(commit);
    const first = commit.entries.first();
    // Effect commits end their job run or API call, or stand alone, so forks start after them.
    const isForkPoint = commit.kind !== CommitKind.State;
    const root = `Commit ${place}, the DAG's root after ${what}, at ${time}`;
    const forkNote = isForkPoint
        ? 'a fork can start here'
        : 'a fork from here starts where its job run or API call began';
    const forkedHere = forks.length === 0 ? '' : `; ${forks.join(', ')} forks here`;
    const unseen = commit.indirect === null ? '' : ', which the service did not see';
    const { module, calledFrom } = gridCommit;
    const called = calledFrom === null ? '' : `, called from ${calledFrom}`;
    const changed = module === null ? '' : `, changing ${module}${called}`;
    return {
        ...emptyCell(column, `commit #${place} ${what}`),
        place,
        // Choosing a commit selects its first event, whose payload the detail panel shows.
        sequence: first?.sequence ?? null,
        mark: commit.kind,
        isLater: isWatched && place > context.place,
        isShown: isWatched && place === context.place,
        forks,
        from,
        isForkPoint,
        module: gridCommit.module,
        calledFrom: gridCommit.calledFrom,
        tooltip: `${root}${unseen}${changed}: ${forkNote}${forkedHere}`,
    };
}

/** A row's label: a group's name, or a commit's time. */
function labelOf(row: ITimelineRow): string {
    const { node } = row;
    if (row.entry !== null) {
        return '';
    }
    if (node.kind !== NodeKind.Commit) {
        return node.label;
    }
    const [first] = [...node.commits.values()];
    const at = first?.[0]?.commit.at.milliseconds ?? 0;
    return formatClockTime(at);
}

/** Whether a row's own line holds a column's commit at a place, as one of its events does not. */
function rowHolds(row: ITimelineRow, column: BranchId, place: Position): boolean {
    const own = row.node.commits.get(column);
    const first = own?.[0];
    const last = own?.at(-1);
    return (
        row.entry === null &&
        first !== undefined &&
        last !== undefined &&
        first.place <= place &&
        place <= last.place
    );
}

/**
 * The row each fork leaves its parent at: the last one holding the parent's commit at the fork
 * point, which is that commit's own row once its groups are open, or the closed group holding it.
 */
function joinRows(
    rows: readonly ITimelineRow[],
    columns: readonly ITimelineColumn[],
): ReadonlyMap<BranchId, number> {
    const pairs = columns.flatMap((column) => {
        const { join } = column;
        if (join === null) {
            return [];
        }
        const indexes = rows.map((row, index) =>
            rowHolds(row, join.column, join.place) ? index : -1,
        );
        const last = Math.max(-1, ...indexes);
        return [[column.id, last] as const];
    });
    return new Map(pairs);
}

/**
 * The row each fork's lane starts at: the one below the row its parent's commit is in, so its
 * line leaves that commit; or that row itself when it also holds some of the fork's own
 * commits, as a closed group around the fork point does, so the line runs into them.
 */
function startRows(
    rows: readonly ITimelineRow[],
    columns: readonly ITimelineColumn[],
): ReadonlyMap<BranchId, number> {
    const joins = joinRows(rows, columns);
    const pairs = [...joins.entries()].map(([id, joinRow]) => {
        const row = rows[joinRow];
        const isSharing = row?.entry === null && row.node.commits.has(id);
        const start = joinRow < 0 ? 0 : joinRow + (isSharing ? 0 : 1);
        return [id, start] as const;
    });
    return new Map(pairs);
}

/** A fork leaving its parent below a row: the columns its line leaves, crosses, and enters. */
interface IForkStart {
    readonly id: BranchId;
    readonly name: string;
    readonly at: number;
    readonly parent: number;
    readonly colour: number;
}

/** The forks whose lanes start at a row, in the columns' order. */
function forksStartingAt(
    index: number,
    columns: readonly ITimelineColumn[],
    starts: ReadonlyMap<BranchId, number>,
): readonly IForkStart[] {
    return columns.flatMap((column, at) => {
        const parent = columns.findIndex((other) => other.id === column.join?.column);
        const colour = column.made % LANE_COLOURS;
        const fork = { id: column.id, name: column.name, at, parent, colour };
        return starts.get(column.id) === index && parent >= 0 ? [fork] : [];
    });
}

/** Each column's lane on an ordinary row: a fork's runs once its connector row is past. */
function lanesAt(
    index: number,
    columns: readonly ITimelineColumn[],
    starts: ReadonlyMap<BranchId, number>,
): readonly ILane[] {
    return columns.map((column) => {
        const start = starts.get(column.id) ?? 0;
        return {
            ...NO_LANE,
            isOn: column.join === null || index >= start,
            colour: column.made % LANE_COLOURS,
        };
    });
}

/**
 * Each column's lane on a fork's connector row: the other lanes go on, and the fork's line curves
 * off its parent's lane, runs across any columns between, and curves down into its own lane.
 */
function connectorLanes(
    below: readonly ILane[],
    fork: IForkStart,
    notYet: ReadonlySet<number>,
): readonly ILane[] {
    return below.map((lane, at) => {
        const isOwn = at === fork.at;
        const isParent = at === fork.parent;
        const isCrossed =
            Math.min(fork.parent, fork.at) < at && at < Math.max(fork.parent, fork.at);
        return {
            ...lane,
            isOn: !isOwn && lane.isOn && !notYet.has(at),
            isStartFromLeft: isOwn && fork.parent < at,
            isStartFromRight: isOwn && fork.parent > at,
            isLeavingLeft: isParent && fork.at < at,
            isLeavingRight: isParent && fork.at > at,
            isCrossed,
            crossing: isParent || isCrossed ? fork.colour : null,
        };
    });
}

/** A fork's connector row, just before the row its lane starts at. */
function connectorRow(
    next: { readonly id: string; readonly depth: number },
    fork: IForkStart,
    lanes: readonly ILane[],
    columns: readonly ITimelineColumn[],
    unaware: ReadonlyMap<BranchId, IUnaware>,
): ITimelineRowView {
    const cells = columns.map((column, at) => {
        const below = unaware.get(column.id)?.part;
        const isInside = below === UnawarePart.Middle || below === UnawarePart.End;
        return {
            ...emptyCell(column.id, ''),
            lane: lanes[at] ?? NO_LANE,
            unaware: isInside ? MIDDLE : null,
        };
    });
    return {
        id: `${next.id}<${fork.id}`,
        key: '',
        kind: NodeKind.Commit,
        depth: next.depth,
        label: `${fork.name} branches off`,
        isEvent: false,
        isConnector: true,
        canOpen: false,
        isOpen: false,
        cells,
    };
}

/** Draws the rows shown against where the run is: each row's label and a cell per column. */
export function timelineRowViews(
    rows: readonly ITimelineRow[],
    columns: readonly ITimelineColumn[],
    context: ITimelineContext,
): readonly ITimelineRowView[] {
    const starts = startRows(rows, columns);
    const unaware = unawareRows(rows, context.isOpen);
    /** The connector rows of the forks whose lanes start at a row, which go just before it. */
    const connectorsAt = (
        index: number,
        next: { readonly id: string; readonly depth: number },
    ): readonly ITimelineRowView[] => {
        const forks = forksStartingAt(index, columns, starts);
        const lanes = lanesAt(index, columns, starts);
        const below = unaware[index] ?? NO_SPANS;
        return forks.map((fork, order) => {
            const later = forks.slice(order + 1).map((after) => after.at);
            const notYet = new Set(later);
            const forkLanes = connectorLanes(lanes, fork, notYet);
            return connectorRow(next, fork, forkLanes, columns, below);
        });
    };
    const views = rows.flatMap((row, index) => {
        const { node, entry } = row;
        const isCommit = node.kind === NodeKind.Commit;
        const lanes = lanesAt(index, columns, starts);
        const cells = columns.map((column) => {
            const own = node.commits.get(column.id) ?? [];
            const [gridCommit] = own;
            if (isCommit && gridCommit !== undefined) {
                return entry === null
                    ? commitCell(gridCommit, columns, context)
                    : eventCell(gridCommit, context, entry);
            }
            return summaryCell(column.id, own, context, node.kind);
        });
        const spans = unaware[index] ?? NO_SPANS;
        const laned = cells.map((cell, at) => ({
            ...cell,
            lane: lanes[at] ?? NO_LANE,
            unaware: spans.get(cell.column) ?? null,
        }));
        const counts = [...node.commits.values()].map((own) => own[0]?.commit.entries.size ?? 0);
        const hasEvents = isCommit && counts.some((count) => count > 0);
        const label = labelOf(row);
        const view: ITimelineRowView = {
            id: entry === null ? node.key : `${node.key}#${entry}`,
            key: node.key,
            kind: node.kind,
            depth: row.depth,
            label,
            isEvent: entry !== null,
            isConnector: false,
            canOpen: entry === null && (!isCommit || hasEvents),
            isOpen: context.isOpen(node),
            cells: laned,
        };
        // Each fork starting here gets a row of its own first, so the curves never overlap.
        const connectors = connectorsAt(index, view);
        return [...connectors, view];
    });
    // A fork whose lane would start below the last row still shows where it leaves.
    const last = views.at(-1);
    const trailing = last === undefined ? [] : connectorsAt(rows.length, last);
    return withCalls([...views, ...trailing]);
}

/**
 * Marks each commit whose next commit, in the same job run or API call, is a call to another
 * module, so an arrow can join the two (FND-87).
 */
function withCalls(views: readonly ITimelineRowView[]): readonly ITimelineRowView[] {
    // Each call's caller: the commit just before it, in the same column.
    const callers = views.flatMap((view) =>
        view.isEvent
            ? []
            : view.cells.flatMap((cell) =>
                  cell.calledFrom === null || cell.place === null
                      ? []
                      : [`${cell.column}:${cell.place - 1}`],
              ),
    );
    const called = new Set(callers);
    if (called.size === 0) {
        return views;
    }
    return views.map((view) => {
        if (view.isEvent || view.kind !== NodeKind.Commit) {
            return view;
        }
        const cells = view.cells.map((cell) =>
            cell.place !== null && called.has(`${cell.column}:${cell.place}`)
                ? { ...cell, isCalling: true }
                : cell,
        );
        return { ...view, cells };
    });
}
