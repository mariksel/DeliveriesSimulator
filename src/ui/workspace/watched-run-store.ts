import { computed, inject, Injectable, signal } from '@angular/core';
import type { IScenarioNames } from '../../application-core/scenarios/scenario-names';
import type { IndirectStatement } from '../../application-core/simulation-engine/indirect-effect';
import { List } from 'immutable';

import { BuiltInScenarios } from '../../application-core/scenarios/built-in-scenarios';
import { ScenarioFiles } from '../../application-core/scenarios/scenario-files';
import type { ClockSpeed } from '../../application/scenarios/live-scenario-run';
import { Ticker } from '../../application-core/scenarios/ticker';
import { WallClock } from '../../application-core/simulation-engine/wall-clock';
import type { OpenResult } from '../../application/verification/run-session';
import { RunSession } from '../../application/verification/run-session';
import type { IWatchedRunStatus } from '../../application/verification/watched-run';
import type { RunLogEntry } from '../../application/scenarios/live-scenario-run';
import { InspectorMode } from '../technical-view/inspector-views';
import type { IRunView } from './run-view';
import { runView } from './run-view';
import { warningLines } from './scenario-warnings';
import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import type { IColumnHeading, ITimelineRowView } from '../run-history/timeline-view';
import {
    columnHeadings,
    opensAt,
    TimelineZoom,
    timelineRowViews,
} from '../run-history/timeline-view';
import type { ITimelineNode } from '../run-history/timeline-grid';
import {
    columnHolding,
    commitNodeAt,
    keysHolding,
    lineThrough,
    RowMode,
    TimelineGrid,
    timelineRows,
} from '../run-history/timeline-grid';
import type { Position } from '../../domain/system/math/math';
import type {
    IBreakpoint,
    IBreakpointHit,
} from '../../application-core/simulation-engine/breakpoints';
import { StepSize } from '../../application-core/simulation-engine/run-places';
import { toLogSequence } from '../../domain/event-log/numbers';
import type { IModuleRulesView, IRuleEdit, IRuleEditProblem } from '../business-rules/rules-view';
import { ruleEditResult, rulesPanelView } from '../business-rules/rules-view';
import type { BuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';

/** What the detail panel can show. */
export const DetailTab = {
    Event: 'Event',
    Verdict: 'Verdict',
} as const;

/** One of the values of {@link DetailTab}. */
export type DetailTab = (typeof DetailTab)[keyof typeof DetailTab];

/** What the main area can show. */
export const MainTab = {
    Inspector: 'Inspector',
    Trace: 'Trace',
    Rules: 'Rules',
    /** Every entry of the log, as FND-77 describes the list. */
    Events: 'Events',
    /** The breakpoints the run pauses at (FND-88). */
    Breakpoints: 'Breakpoints',
} as const;

/** One of the values of {@link MainTab}. */
export type MainTab = (typeof MainTab)[keyof typeof MainTab];

/** No group opened or closed by hand. */
const NONE_TOGGLED: ReadonlyMap<string, boolean> = new Map();

/** A commit or event someone chose on the timeline. */
export interface ITimelineChoice {
    readonly branch: BranchId;
    readonly place: Position;
    readonly sequence: number | null;
}

/** The timeline's grids, one for each way of lining up rows, for one run. */
interface ITimelineGrids {
    readonly run: unknown;
    readonly byTime: TimelineGrid;
    readonly byNumber: TimelineGrid;
}

/**
 * Connects the run session to the screen: it turns each change into a signal, and decides nothing
 * itself.
 */
@Injectable({ providedIn: 'root' })
export class WatchedRunStore {
    private readonly status = signal<IWatchedRunStatus | null>(null);
    private grids: ITimelineGrids | null = null;
    /** Moves on each time the grids take in more, as they change in place. */
    private readonly gridVersion = signal(0);
    /**
     * The groups someone opened or closed on the timeline. The others are open while they hold
     * the commit shown (FND-87).
     */
    private readonly toggled = signal<ReadonlyMap<string, boolean>>(NONE_TOGGLED);
    /**
     * Whether the way down to the selected event is open: from selecting it until the zoom or
     * the rows' mode changes, which then applies as chosen (FND-87).
     */
    private readonly isOpenToSelection = signal(true);
    private readonly session = new RunSession({
        wallClock: inject(WallClock),
        ticker: inject(Ticker),
        files: inject(ScenarioFiles),
        builtIns: inject(BuiltInScenarios),
        onChange: (): void => {
            const before = this.status();
            const status = this.session.run?.status ?? null;
            this.status.set(status);
            this.updateGrids(status);
            this.showWhatChanged(before, status);
        },
    });

    /** The sequence number of the entry selected, if any. */
    readonly selected = signal<number | null>(null);
    readonly tab = signal<DetailTab>(DetailTab.Event);
    /** What the main area shows, which stays as chosen when someone leaves the workspace. */
    readonly mainTab = signal<MainTab>(MainTab.Inspector);
    /**
     * How the inspector arranges its records, which stays as chosen when someone leaves the
     * workspace.
     */
    readonly inspectorMode = signal<InspectorMode>(InspectorMode.ByFlow);
    /** What reading the open scenario warned about, as lines to show. */
    readonly warnings = signal<readonly string[]>([]);
    /** How far Back and Forward move: one commit, or one job run or API call (FND-86). */
    readonly stepSize = signal<StepSize>(StepSize.Commit);
    /** Why the last value typed into the Rules panel was not used, if it was not. */
    readonly ruleProblem = signal<IRuleEditProblem | null>(null);

    /** The run's log as it stood at the place shown, or nothing when no run is open. */
    readonly entries = computed<List<RunLogEntry>>(() => this.status()?.entries ?? List());

    /** The run's whole log, whatever place is shown. */
    readonly allEntries = computed<List<RunLogEntry>>(() => this.status()?.allEntries ?? List());

    /** The entry selected, if any. */
    readonly selectedEntry = computed<RunLogEntry | null>(() => {
        const sequence = this.selected();
        return sequence === null ? null : (this.allEntries().get(sequence) ?? null);
    });

    /** How the timeline lines its rows up across the branches (FND-87). */
    readonly rowMode = signal<RowMode>(RowMode.ByTime);
    /** How far the timeline is zoomed: which groups start open (FND-87). */
    readonly zoom = signal<TimelineZoom>(TimelineZoom.Middle);

    /** The timeline's column headings, one for each branch, in the tree's order. */
    readonly timelineHeadings = computed<readonly IColumnHeading[]>(() => {
        this.gridVersion();
        const grid = this.currentGrid();
        return grid === null ? [] : columnHeadings(grid.columns);
    });

    /**
     * The timeline's rows as shown: groups open while they hold the commit shown, unless someone
     * closed them, and the commit shown open to its events while one is selected (FND-87).
     */
    readonly timelineRows = computed<readonly ITimelineRowView[]>(() => {
        this.gridVersion();
        const grid = this.currentGrid();
        const status = this.status();
        if (grid === null || status === null) {
            return [];
        }
        const { currentBranch, place } = status;
        const selected = this.selected();
        const zoom = this.zoom();
        const toggled = this.toggled();
        const line = lineThrough(grid.columns, currentBranch);
        const holder = columnHolding(grid.columns, currentBranch, place);
        // A selected event's commit opens, with the groups down to it, so the event shows.
        const isToSelection = selected !== null && this.isOpenToSelection();
        const toEvent = isToSelection ? keysHolding(grid.nodes, holder, place) : [];
        const commitKey = isToSelection ? commitNodeAt(grid.nodes, holder, place)?.key : null;
        const opened = new Set([...toEvent, commitKey]);
        const isOpen = (node: ITimelineNode): boolean =>
            toggled.get(node.key) ?? (opensAt(zoom, node.kind) || opened.has(node.key));
        const rows = timelineRows(grid.nodes, isOpen);
        const context = { currentBranch, line, place, selected, isOpen };
        return timelineRowViews(rows, grid.columns, context);
    });

    /** The breakpoints, in the order they were added (FND-88). */
    readonly breakpoints = computed<readonly IBreakpoint[]>(
        () => this.status()?.breakpoints ?? [],
    );

    /** The drivers, restaurants, and orders the scenario names, for the indirect effect form. */
    readonly names = computed<IScenarioNames>(
        () => this.status()?.names ?? { drivers: [], restaurants: [], orders: [] },
    );

    /** The breakpoint the run last stopped at, until it goes on. */
    readonly lastHit = computed<IBreakpointHit | null>(() => this.status()?.lastHit ?? null);

    /** The event kinds the run's log holds, which the Breakpoints tab offers. */
    readonly loggedKinds = computed<readonly string[]>(() => {
        const kinds = this.allEntries().map((entry) => entry.kind);
        const distinct = new Set(kinds);
        return [...distinct].sort();
    });

    /** The kinds that a breakpoint matches whatever its source and order, and is on. */
    readonly kindsPausedAt = computed<ReadonlySet<string>>(() => {
        const plain = this.breakpoints().filter(
            (breakpoint) =>
                breakpoint.isOn && breakpoint.source === null && breakpoint.order === null,
        );
        const kinds = plain.map((breakpoint) => breakpoint.kind);
        return new Set(kinds);
    });

    /** Each module's rules with the values in use, as the Rules panel lists them. */
    readonly rules = computed<readonly IModuleRulesView[]>(() => {
        const status = this.status();
        return status === null ? [] : rulesPanelView(status.rules);
    });

    /** What to show, or null when no run is open. */
    readonly view = computed<IRunView | null>(() => {
        const status = this.status();
        return status === null ? null : runView(status);
    });

    openBuiltIn(id: BuiltInScenarioId): OpenResult {
        const openBuiltIn = this.session.openBuiltIn(id);
        return this.afterOpening(openBuiltIn);
    }

    async openFile(file: File): Promise<OpenResult> {
        const openFile = await this.session.openFile(file);
        return this.afterOpening(openFile);
    }

    /** Selects an entry, and shows it, with the run at the commit that wrote it (FND-86). */
    select(sequence: number): void {
        this.selected.set(sequence);
        this.isOpenToSelection.set(true);
        this.tab.set(DetailTab.Event);
        const entrySequence = toLogSequence(sequence);
        this.session.run?.showEntry(entrySequence);
    }

    /** Adds a breakpoint on an event kind, narrowed if wanted to a source and an order. */
    addBreakpoint(kind: string, source: string | null, order: string | null): void {
        this.session.run?.addBreakpoint(kind, source, order);
    }

    /** Switches a breakpoint on or off, keeping it. */
    switchBreakpoint(id: number, isOn: boolean): void {
        this.session.run?.switchBreakpoint(id, isOn);
    }

    removeBreakpoint(id: number): void {
        this.session.run?.removeBreakpoint(id);
    }

    /**
     * Pauses at every event of a kind, or stops doing so: an event's pause on this kind icon adds
     * a breakpoint on the kind alone, or removes the one there is (FND-88).
     */
    toggleKindBreakpoint(kind: string): void {
        const plain = this.breakpoints().find(
            (breakpoint) =>
                breakpoint.kind === kind &&
                breakpoint.source === null &&
                breakpoint.order === null,
        );
        if (plain === undefined) {
            this.addBreakpoint(kind, null, null);
            return;
        }
        this.removeBreakpoint(plain.id);
    }

    /** Opens or closes a group or a commit on the timeline. */
    toggleNode(key: string, isOpen: boolean): void {
        this.toggled.update((toggled) => new Map(toggled).set(key, !isOpen));
    }

    /** Lines rows up another way, with the groups opened afresh for it. */
    chooseRowMode(mode: RowMode): void {
        this.rowMode.set(mode);
        this.toggled.set(NONE_TOGGLED);
        this.isOpenToSelection.set(false);
    }

    /** Zooms the timeline, opening its groups afresh at that level. */
    chooseZoom(zoom: TimelineZoom): void {
        this.zoom.set(zoom);
        this.toggled.set(NONE_TOGGLED);
        this.isOpenToSelection.set(false);
    }

    /**
     * Shows a commit or event chosen on the timeline, on whichever branch it is: another branch
     * is watched first (FND-87). Its event, or the commit's first, is selected.
     */
    chooseOnTimeline(choice: ITimelineChoice): void {
        const run = this.session.run;
        if (run === null) {
            return;
        }
        run.showCommit(choice.branch, choice.place);
        if (choice.sequence === null) {
            this.selected.set(null);
            return;
        }
        this.select(choice.sequence);
    }

    /** Shows the place one step back. */
    back(): void {
        const size = this.stepSize();
        this.session.run?.back(size);
    }

    /** Shows the place one step forward. */
    forward(): void {
        const size = this.stepSize();
        this.session.run?.forward(size);
    }

    /** Shows a place, from 0 at the start to the latest. */
    showPlace(place: number): void {
        this.session.run?.showPlace(place);
    }

    /** Follows the latest commit again. */
    showLatest(): void {
        this.session.run?.showLatest();
    }

    /** Starts a new branch at the place shown, and watches it (FND-87). */
    forkHere(): void {
        this.session.run?.forkHere();
        this.startDetailAfresh();
    }

    /**
     * States an indirect effect at the commit shown, forking first from an earlier one, and shows
     * its event (FND-89).
     */
    stateIndirect(statement: IndirectStatement): void {
        const wasLatest = this.status()?.isShowingLatest ?? true;
        this.session.run?.stateIndirect(statement);
        if (!wasLatest) {
            this.startDetailAfresh();
        }
    }

    /** Forks at a fork point on the timeline: a branch begins after that commit (FND-87). */
    forkAtCommit(choice: ITimelineChoice): void {
        this.session.run?.showCommit(choice.branch, choice.place);
        this.forkHere();
    }

    /** Watches another branch. */
    watchBranch(id: BranchId): void {
        this.session.run?.switchBranch(id);
        this.startDetailAfresh();
    }

    /** Gives a branch another name; a blank one is ignored. */
    renameBranch(id: BranchId, name: string): void {
        if (name.trim() !== '') {
            this.session.run?.renameBranch(id, name);
        }
    }

    /** Repeats the run from the place shown, and shows what that came to. */
    repeatFromHere(): void {
        this.session.run?.repeatFromShown();
    }

    showTab(tab: DetailTab): void {
        this.tab.set(tab);
    }

    showMainTab(tab: MainTab): void {
        this.mainTab.set(tab);
    }

    startOrPause(): void {
        this.session.run?.toggle();
    }

    step(): void {
        this.session.run?.step();
    }

    setSpeed(speed: ClockSpeed): void {
        this.session.run?.setSpeed(speed);
    }

    /**
     * Changes a rule parameter to a typed value, as a config change commit, or says why it
     * cannot (FND-84).
     */
    changeRule(edit: IRuleEdit): void {
        const status = this.status();
        if (status === null) {
            return;
        }
        const result = ruleEditResult(status.rules, edit);
        if (!result.isOk) {
            this.ruleProblem.set(result.problem);
            return;
        }
        this.ruleProblem.set(null);
        const changes = List([result.change]);
        this.session.run?.changeRules(changes);
    }

    runOnPastTheEnd(): void {
        this.session.run?.runOnPastTheEnd();
    }

    /** Starts the scenario afresh, keeping the breakpoints, switched as they were (FND-88). */
    runAgain(): void {
        const kept = this.breakpoints();
        this.session.runAgain();
        kept.forEach((breakpoint) => {
            this.session.run?.addBreakpoint(breakpoint.kind, breakpoint.source, breakpoint.order);
        });
        const added = this.breakpoints();
        kept.forEach((breakpoint, index) => {
            const again = added[index];
            if (!breakpoint.isOn && again !== undefined) {
                this.session.run?.switchBreakpoint(again.id, false);
            }
        });
        this.startDetailAfresh();
    }

    leave(): void {
        this.session.run?.leave();
    }

    comeBack(): void {
        this.session.run?.comeBack();
    }

    /**
     * Opens the verdict when the run is judged, and selects the event a breakpoint the run
     * stopped at was reached by (FND-88).
     */
    private showWhatChanged(
        before: IWatchedRunStatus | null,
        status: IWatchedRunStatus | null,
    ): void {
        if (before !== null && status !== null) {
            this.openVerdictWhenJudged(before, status);
            this.selectNewHit(before, status);
        } else if (status !== null) {
            this.selectNewHit(null, status);
        }
    }

    private openVerdictWhenJudged(before: IWatchedRunStatus, status: IWatchedRunStatus): void {
        if (before.verdict === null && status.verdict !== null) {
            this.tab.set(DetailTab.Verdict);
        }
    }

    private selectNewHit(before: IWatchedRunStatus | null, status: IWatchedRunStatus): void {
        const hitBefore = before?.lastHit ?? null;
        if (status.lastHit !== null && status.lastHit !== hitBefore) {
            this.selectHit(status.lastHit);
        }
    }

    /** Selects the event that reached a breakpoint, opening the way down to it. */
    private selectHit(hit: IBreakpointHit): void {
        this.selected.set(hit.entry.sequence);
        this.tab.set(DetailTab.Event);
        this.isOpenToSelection.set(true);
    }

    /** The grid for the rows' mode, if a run is open. */
    private currentGrid(): TimelineGrid | null {
        const grids = this.grids;
        if (grids === null) {
            return null;
        }
        return this.rowMode() === RowMode.ByTime ? grids.byTime : grids.byNumber;
    }

    /** Takes the run's new commits into the timeline's grids, starting afresh for a new run. */
    private updateGrids(status: IWatchedRunStatus | null): void {
        const run = this.session.run;
        if (status === null || run === null) {
            this.grids = null;
            return;
        }
        if (this.grids?.run !== run) {
            const byTime = new TimelineGrid(RowMode.ByTime);
            const byNumber = new TimelineGrid(RowMode.ByNumber);
            this.grids = { run, byTime, byNumber };
            this.toggled.set(NONE_TOGGLED);
        }
        const lines = status.branchLines.toArray();
        this.grids.byTime.update(lines);
        this.grids.byNumber.update(lines);
        this.gridVersion.update((version) => version + 1);
    }

    private afterOpening(result: OpenResult): OpenResult {
        if (result.isOk) {
            this.startDetailAfresh();
            const lines = warningLines(this.session.warnings);
            this.warnings.set(lines);
        }
        return result;
    }

    private startDetailAfresh(): void {
        this.ruleProblem.set(null);
        this.selected.set(null);
        this.tab.set(DetailTab.Event);
    }
}
