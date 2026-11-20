import type { IMapScene } from './map-view/map-scene';
import type { MapLayer } from './map-view/map-layer';
import { ALL_LAYERS } from './map-view/map-layer';
import { mapScene, streetsOf } from './map-view/map-scene';
import type { ISnapshotDifference } from '../../application-core/verification/snapshot-test';
import type { ISnapshotResults } from '../../application/verification/snapshot-tests';
import { snapshotTestsOfSaved } from '../../application/verification/snapshot-tests';
import { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
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
import type { IColumnHeading, IHighlight, ITimelineRowView } from '../run-history/timeline-view';
import {
    COLLAPSED_KINDS,
    columnHeadings,
    opensAt,
    TimelineZoom,
    timelineRowViews,
} from '../run-history/timeline-view';
import type { ITimelineNode } from '../run-history/timeline-grid';
import {
    columnHolding,
    commitNodeAt,
    groupsHolding,
    lineThrough,
    NodeKind,
    TimelineGrid,
    timelineRows,
    TimelineView,
} from '../run-history/timeline-grid';
import type { SubjectId } from '../run-history/timeline-subjects';
import type { HiddenKinds } from '../run-history/timeline-shown';
import { NOTHING_HIDDEN, shownNodes } from '../run-history/timeline-shown';
import { DEFAULT_GAP_THRESHOLD_MS, GapDisplay, gapsBefore } from '../run-history/timeline-gaps';
import type { CommitKind } from '../../application-core/simulation-engine/commit';
import type { IRecordVersionsView } from '../run-history/record-versions-view';
import { orderRecords, recordVersionsView } from '../run-history/record-versions-view';
import { toOrderId } from '../../domain/orders/order';
import type { Position } from '../../domain/system/math/math';
import type {
    IBreakpoint,
    IBreakpointHit,
} from '../../application-core/simulation-engine/breakpoints';
import { StepSize } from '../../application-core/simulation-engine/run-places';
import { toLogSequence } from '../../domain/event-log/numbers';
import { toIndirectLabel } from '../../application-core/simulation-engine/run-input';
import type {
    IFunctionChoice,
    IModuleRulesView,
    IRuleEdit,
    IRuleEditProblem,
} from '../business-rules/rules-view';
import { ruleEditResult, rulesPanelView } from '../business-rules/rules-view';
import type { BuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';
import { Calendar } from '../../application-core/run-history/calendar';
import { RunRepository } from '../../application-core/run-history/run-repository';
import type {
    ILoadProgress,
    ISavedRun,
    RunLevel,
    SaveOutcome,
    SavedRunId,
} from '../../application-core/run-history/saved-run';
import type { OpenSavedResult } from '../../application/verification/run-session';
import { deleteSavedRun } from '../../application/run-history/saved-runs';
import { ScenarioRepository } from '../../application-core/scenarios/scenario-repository';
import type { ISavedRunStores } from '../../application/run-history/saved-runs';
import { savedRunName } from '../run-history/save-run-form/saved-run-name';

/** What the detail panel can show. */
export const DetailTab = {
    Event: 'Event',
    Verdict: 'Verdict',
} as const;

/** One of the values of {@link DetailTab}. */
export type DetailTab = (typeof DetailTab)[keyof typeof DetailTab];

/** What the main area can show. */
export const MainTab = {
    /** The city, its restaurants, drivers, and orders, which a run opens on (FND-90). */
    Map: 'Map',
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

/** No gap to state, as in every view but the view by time. */
const NO_GAPS: ReadonlyMap<number, number> = new Map();

/** No group opened or closed by hand. */
const NONE_TOGGLED: ReadonlyMap<string, boolean> = new Map();

/** A commit or event someone chose on the timeline. */
export interface ITimelineChoice {
    readonly branch: BranchId;
    readonly place: Position;
    readonly sequence: number | null;
}

/** The timeline's grids, one for each view made so far, for one run. */
interface ITimelineGrids {
    readonly run: unknown;
    readonly byView: Map<TimelineView, TimelineGrid>;
}

/**
 * The views whose grids are kept from a run's start. The views by order and by driver are made
 * the first time they are chosen, then kept up to date, as a city day's would hold about 500 MB
 * more (FND-81).
 */
const FROM_THE_START: readonly TimelineView[] = [TimelineView.ByTime, TimelineView.ByNumber];

/** An order or a driver someone selected on the timeline, by its group in its view. */
export interface ISubjectChoice {
    readonly kind: NodeKind;
    readonly key: string;
    readonly subject: SubjectId;
}

/** The order or driver selected, with the view whose grid holds its group. */
interface ISelectedSubject extends ISubjectChoice {
    readonly view: TimelineView;
}

/**
 * Connects the run session to the screen: it turns each change into a signal, and decides nothing
 * itself.
 */
@Injectable({ providedIn: 'root' })
export class WatchedRunStore {
    private readonly status = signal<IWatchedRunStatus | null>(null);
    private readonly calendar = inject(Calendar);
    /** The first commit each saved run's snapshot test found differing, shown when it opens. */
    private readonly differences = new Map<SavedRunId, ISnapshotDifference>();
    /** Where saved runs and the scenario versions they ran are stored (FND-81). */
    private readonly stores: ISavedRunStores = {
        runs: inject(RunRepository),
        scenarios: inject(ScenarioRepository),
    };
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
     * the view changes, which then applies as chosen (FND-87).
     */
    private readonly isOpenToSelection = signal(true);
    /** The run's city, which changes only when another run opens. */
    private readonly mapCity = computed(() => this.status()?.world.script.city ?? null);
    /** The city's streets, worked out once for each city, not at every commit (FND-90). */
    private readonly mapStreets = computed(() => {
        const city = this.mapCity();
        return city === null ? [] : streetsOf(city);
    });
    private readonly session = new RunSession({
        wallClock: inject(WallClock),
        functions: inject(FunctionLookup),
        ticker: inject(Ticker),
        files: inject(ScenarioFiles),
        builtIns: inject(BuiltInScenarios),
        stores: this.stores,
        onChange: (): void => {
            const before = this.status();
            const status = this.session.run?.status ?? null;
            this.status.set(status);
            this.updateGrids(status);
            this.showWhatChanged(before, status);
        },
    });

    /** What is told of each saved run, newest first, as last read from storage (FND-81). */
    readonly savedRuns = signal<readonly ISavedRun[]>([]);

    /** The sequence number of the entry selected, if any. */
    readonly selected = signal<number | null>(null);
    readonly tab = signal<DetailTab>(DetailTab.Event);
    /** What the main area shows, which stays as chosen when someone leaves the workspace. */
    readonly mainTab = signal<MainTab>(MainTab.Map);
    /** The kinds of order view the map shows, each with its switch (FND-90). */
    readonly mapLayers = signal<ReadonlySet<MapLayer>>(ALL_LAYERS);
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

    /** How the timeline groups and lines its rows up across the branches (FND-81, FND-87). */
    readonly timelineView = signal<TimelineView>(TimelineView.ByTime);
    /** The order or driver selected, which every view highlights (FND-81). */
    readonly selectedSubject = signal<ISelectedSubject | null>(null);
    /**
     * The kinds of commit the timeline's filter hides, which stay as chosen while the app is open
     * and are not saved with the run (FND-81).
     */
    readonly hiddenKinds = signal<HiddenKinds>(NOTHING_HIDDEN);
    /**
     * How long a gap in simulated time must be to show, in milliseconds, which stays as chosen
     * while the app is open (FND-81).
     */
    readonly gapThresholdMs = signal(DEFAULT_GAP_THRESHOLD_MS);
    /** Whether gaps show as rows or as space to scale, kept while the app is open (FND-81). */
    readonly gapDisplay = signal<GapDisplay>(GapDisplay.List);
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
        const hidden = this.hiddenKinds();
        const nodes = shownNodes(grid.nodes, hidden);
        const toShown = groupsHolding(nodes, holder, place);
        // Collapsed empty job runs open to show the commit shown, as no zoom level opens them.
        const collapsed = toShown.filter((group) => COLLAPSED_KINDS.has(group.kind));
        // A selected event's commit opens, with the groups down to it, so the event shows.
        const isToSelection = selected !== null && this.isOpenToSelection();
        const toEvent = isToSelection ? toShown : collapsed;
        const commitKey = isToSelection ? commitNodeAt(nodes, holder, place)?.key : null;
        const toEventKeys = toEvent.map((group) => group.key);
        const opened = new Set([...toEventKeys, commitKey]);
        const isOpen = (node: ITimelineNode): boolean =>
            toggled.get(node.key) ?? (opensAt(zoom, node.kind) || opened.has(node.key));
        const rows = timelineRows(nodes, isOpen);
        const highlight = this.highlight();
        // Gaps show in the view by time only (FND-81).
        const isByTime = this.timelineView() === TimelineView.ByTime;
        const threshold = this.gapThresholdMs();
        const gaps = isByTime ? gapsBefore(rows, isOpen, threshold) : NO_GAPS;
        const context = { currentBranch, line, place, selected, isOpen, highlight, gaps };
        return timelineRowViews(rows, grid.columns, context);
    });

    /**
     * The selected order's versions, in Orders and in Deliveries, as they stood at the commit
     * shown, each with the commit that made it (FND-81). None while no order is selected.
     */
    readonly orderVersions = computed<readonly IRecordVersionsView[]>(() => {
        const status = this.status();
        const choice = this.selectedSubject();
        const run = this.session.run;
        if (status === null || choice?.kind !== NodeKind.Order || run === null) {
            return [];
        }
        const orderId = toOrderId(choice.subject);
        return orderRecords(orderId).map((record) => {
            const versions = run.versionsOf(record);
            return recordVersionsView(record, versions);
        });
    });

    /** The breakpoints, in the order they were added (FND-88). */
    readonly breakpoints = computed<readonly IBreakpoint[]>(
        () => this.status()?.breakpoints ?? [],
    );

    /** The drivers, restaurants, and orders the scenario names, for the indirect effect form. */
    readonly names = computed<IScenarioNames>(
        () => this.status()?.names ?? { drivers: [], restaurants: [], orders: [] },
    );

    /** The labels a config change can follow from at the place shown (FND-89). */
    readonly followableLabels = computed<readonly string[]>(
        () => this.status()?.followableLabels ?? [],
    );

    /** Every label the run uses, which a label given by hand may not repeat (FND-89). */
    readonly usedLabels = computed<readonly string[]>(() => this.status()?.usedLabels ?? []);

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
        return status === null ? [] : rulesPanelView(status.rules, status);
    });

    /** What the Map view draws at the commit shown, or null with no run, or a run with no city. */
    readonly mapScene = computed<IMapScene | null>(() => {
        const status = this.status();
        const streets = this.mapStreets();
        return status === null ? null : mapScene(status.world, streets);
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

    /**
     * Shows the timeline in another view, with the groups opened afresh for it; the commit shown
     * and the event selected stay as they are (FND-81).
     */
    chooseView(view: TimelineView): void {
        this.timelineView.set(view);
        this.toggled.set(NONE_TOGGLED);
        this.isOpenToSelection.set(false);
        // A view by order or by driver chosen for the first time has its grid made now.
        const status = this.status();
        this.updateGrids(status);
    }

    /**
     * Selects an order or a driver, which every view then highlights, or clears it when it is
     * selected already (FND-81).
     */
    chooseSubject(choice: ISubjectChoice): void {
        const selected = this.selectedSubject();
        if (selected?.key === choice.key) {
            this.selectedSubject.set(null);
            return;
        }
        const view = choice.kind === NodeKind.Order ? TimelineView.ByOrder : TimelineView.ByDriver;
        this.selectedSubject.set({ ...choice, view });
    }

    /** Stops highlighting the order or driver selected. */
    clearSubject(): void {
        this.selectedSubject.set(null);
    }

    /** Shows gaps as rows stating them, or as space to scale on an axis (FND-81). */
    chooseGapDisplay(display: GapDisplay): void {
        this.gapDisplay.set(display);
    }

    /** Shows only the gaps longer than a threshold, in simulated milliseconds (FND-81). */
    chooseGapThreshold(thresholdMs: number): void {
        this.gapThresholdMs.set(thresholdMs);
    }

    /** Shows or hides one kind of commit on the timeline, in every view (FND-81). */
    toggleKind(kind: CommitKind): void {
        this.hiddenKinds.update((hidden) => {
            const changed = new Set(hidden);
            if (!changed.delete(kind)) {
                changed.add(kind);
            }
            return changed;
        });
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

    /** Shows a commit of the branch watched, such as the one that made an order's version. */
    showCommitOfWatched(place: Position): void {
        const branch = this.status()?.currentBranch;
        if (branch !== undefined) {
            this.chooseOnTimeline({ branch, place, sequence: null });
        }
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

    /** The name a saved run is offered: the scenario's name and the date and time now. */
    saveName(): string {
        const scenarioName = this.status()?.scenarioName ?? '';
        const now = this.calendar.now();
        return savedRunName(scenarioName, now);
    }

    /**
     * Saves the run being watched at a level, pausing it while it saves (FND-81), or gives null
     * when no run is open.
     */
    async save(name: string, level: RunLevel): Promise<SaveOutcome | null> {
        const run = this.session.run;
        if (run === null) {
            return null;
        }
        const now = this.calendar.now();
        const outcome = await run.save(this.stores, name, level, now);
        await this.refreshSavedRuns();
        return outcome;
    }

    /**
     * Deletes a branch with no forks of its own, never Main, from the run being watched and from
     * the saved run it came from or was last saved as (FND-81).
     */
    async deleteBranch(id: BranchId): Promise<void> {
        await this.session.run?.deleteBranch(this.stores, id);
        this.startDetailAfresh();
        await this.refreshSavedRuns();
    }

    /** Whether the run being watched has changed since it was last saved or opened. */
    isUnsaved(): boolean {
        return this.session.isUnsaved;
    }

    /** Reads what is told of every saved run again, newest first. */
    async refreshSavedRuns(): Promise<void> {
        const listed = await this.stores.runs.list();
        const newestFirst = [...listed].reverse();
        this.savedRuns.set(newestFirst);
    }

    /**
     * Opens a saved run in place of the run being watched, telling how far loading has got
     * (FND-81).
     */
    async openSaved(
        id: SavedRunId,
        onProgress: (progress: ILoadProgress) => void,
    ): Promise<OpenSavedResult> {
        const opened = await this.session.openSaved(id, onProgress);
        if (opened.isOk) {
            this.warnings.set([]);
            this.startDetailAfresh();
            const difference = this.differences.get(id);
            if (difference !== undefined) {
                this.session.run?.showCommit(difference.branch, difference.place);
            }
        }
        return opened;
    }

    /**
     * Runs both snapshot tests of a saved run, with its own versions and the newest, and keeps the
     * first commit either found differing, to show when the run is opened (FND-81).
     */
    async snapshotTestSaved(id: SavedRunId): Promise<ISnapshotResults | undefined> {
        const results = await snapshotTestsOfSaved(this.stores.runs, id);
        const difference = results?.own.difference ?? results?.newest.difference ?? null;
        if (difference === null) {
            this.differences.delete(id);
        } else {
            this.differences.set(id, difference);
        }
        return results;
    }

    /** Moves a saved run to another level, then reads the saved runs again. */
    async moveSaved(id: SavedRunId, level: RunLevel): Promise<SaveOutcome | undefined> {
        const moved = await this.stores.runs.moveTo(id, level);
        await this.refreshSavedRuns();
        return moved;
    }

    /** Deletes a saved run, releasing the scenario version it ran, then reads them again. */
    async deleteSaved(id: SavedRunId): Promise<void> {
        await deleteSavedRun(this.stores, id);
        await this.refreshSavedRuns();
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

    /** Shows a kind of order view on the map, or hides it (FND-90). */
    toggleMapLayer(layer: MapLayer): void {
        this.mapLayers.update((shown) => {
            const next = new Set(shown);
            if (!next.delete(layer)) {
                next.add(layer);
            }
            return next;
        });
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
        const after = edit.after === undefined ? undefined : toIndirectLabel(edit.after);
        this.session.run?.changeRules(changes, after);
    }

    /**
     * Switches a state function to another version at the commit shown, as an implementation
     * change commit, forking first from an earlier commit (FND-81).
     */
    useVersion(choice: IFunctionChoice): void {
        const uses = List([{ function: choice.function, version: choice.version }]);
        const after = choice.after === undefined ? undefined : toIndirectLabel(choice.after);
        this.session.run?.switchVersions(uses, after);
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

    /** The grid for the view, if a run is open. */
    private currentGrid(): TimelineGrid | null {
        const view = this.timelineView();
        return this.grids?.byView.get(view) ?? null;
    }

    /** The selected order's or driver's group and its commits, which every view highlights. */
    private highlight(): IHighlight | null {
        const choice = this.selectedSubject();
        const grid = choice === null ? undefined : this.grids?.byView.get(choice.view);
        const node = grid?.nodes.find((each) => each.key === choice?.key);
        return node === undefined ? null : { key: node.key, commits: node.commits };
    }

    /** Takes the run's new commits into the timeline's grids, starting afresh for a new run. */
    private updateGrids(status: IWatchedRunStatus | null): void {
        const run = this.session.run;
        if (status === null || run === null) {
            this.grids = null;
            return;
        }
        if (this.grids?.run !== run) {
            const pairs = FROM_THE_START.map((view) => [view, new TimelineGrid(view)] as const);
            const byView = new Map(pairs);
            this.grids = { run, byView };
            this.toggled.set(NONE_TOGGLED);
            this.selectedSubject.set(null);
        }
        const shown = this.timelineView();
        if (!this.grids.byView.has(shown)) {
            const grid = new TimelineGrid(shown);
            this.grids.byView.set(shown, grid);
        }
        const lines = status.branchLines.toArray();
        this.grids.byView.forEach((grid) => {
            grid.update(lines);
        });
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
