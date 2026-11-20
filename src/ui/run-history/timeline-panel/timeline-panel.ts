import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
    afterEveryRender,
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';

import type { BranchId } from '../../../application-core/simulation-engine/branch-id';
import { BreakpointIcon } from '../../shell/icons/breakpoint-icon';
import { ForkIcon } from '../../shell/icons/fork-icon';
import { PencilIcon } from '../../shell/icons/pencil-icon';
import { TrashIcon } from '../../shell/icons/trash-icon';
import { Tooltip } from '../../shell/tooltip/tooltip';
import type { ISubjectChoice, ITimelineChoice } from '../../workspace/watched-run-store';
import { CommitKind } from '../../../application-core/simulation-engine/commit';
import { NodeKind, TimelineView } from '../timeline-grid';
import { GapDisplay, gapHeights, rowOffsets } from '../timeline-gaps';
import { RowOffsets } from './row-offsets-scroll';
import type { IColumnHeading, ITimelineCell, ITimelineRowView } from '../timeline-view';
import { TimelineZoom, zoomLabel } from '../timeline-view';

/** No kind of commit hidden. */
const NO_HIDDEN_KINDS: ReadonlySet<CommitKind> = new Set();

/** No kinds: what the timeline shows before any breakpoint is set. */
const NO_KINDS: ReadonlySet<string> = new Set();

/** The height of one row, which virtual scrolling needs to know. The stylesheet sets the same. */
const ROW_HEIGHT_PX = 30;

/** A new name a person typed for a branch. */
export interface IBranchRename {
    readonly id: BranchId;
    readonly name: string;
}

/** One of the switch's views: its label and what it does. */
interface IViewButton {
    readonly view: TimelineView;
    readonly label: string;
    readonly tooltip: string;
}

/** The views the switch offers, in order (FND-81). */
const VIEW_BUTTONS: readonly IViewButton[] = [
    {
        view: TimelineView.ByTime,
        label: 'By time',
        tooltip: 'Line commits up by simulated time, under hours and minutes',
    },
    {
        view: TimelineView.ByNumber,
        label: 'By number',
        tooltip: "Line up each branch's nth job run or API call, under hundreds and tens",
    },
    {
        view: TimelineView.ByOrder,
        label: 'By order',
        tooltip: 'Group commits by the order they touched, then by job run or API call',
    },
    {
        view: TimelineView.ByDriver,
        label: 'By driver',
        tooltip: 'Group commits by the driver they touched, then by job run or API call',
    },
];

/** One kind of commit the filter shows or hides, and what it is called. */
interface IKindButton {
    readonly kind: CommitKind;
    readonly label: string;
}

/** The kinds of commit the filter offers, in the order the switch shows them (FND-81). */
const KIND_BUTTONS: readonly IKindButton[] = [
    { kind: CommitKind.State, label: 'State' },
    { kind: CommitKind.Input, label: 'API calls' },
    { kind: CommitKind.Job, label: 'Job runs' },
    { kind: CommitKind.ConfigChange, label: 'Config changes' },
    { kind: CommitKind.ImplementationChange, label: 'Implementation changes' },
    { kind: CommitKind.Indirect, label: 'Indirect' },
];

/** One of the gap thresholds offered, in simulated milliseconds, and what it is called. */
interface IThreshold {
    readonly ms: number;
    readonly label: string;
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const TEN = 10;
const THIRTY = 30;
const FIVE = 5;
const FIFTEEN = 15;

/** The gap thresholds the panel offers, from the shortest (FND-81). */
const THRESHOLDS: readonly IThreshold[] = [
    { ms: TEN * MS_PER_SECOND, label: '10 s' },
    { ms: THIRTY * MS_PER_SECOND, label: '30 s' },
    { ms: MS_PER_MINUTE, label: '1 min' },
    { ms: FIVE * MS_PER_MINUTE, label: '5 min' },
    { ms: FIFTEEN * MS_PER_MINUTE, label: '15 min' },
    { ms: MS_PER_HOUR, label: '1 h' },
];

/** A group or commit to open or close, and whether it is open now. */
export interface INodeToggle {
    readonly key: string;
    readonly isOpen: boolean;
}

/**
 * The run's timeline: a column for each branch, each holding its own commits, and rows lined up
 * across them by time or by number, in groups that open and close. A commit opens to its events.
 * It follows the commit shown until someone looks elsewhere (FND-81, FND-87).
 */
@Component({
    selector: 'app-timeline-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        BreakpointIcon,
        ForkIcon,
        PencilIcon,
        RowOffsets,
        ScrollingModule,
        Tooltip,
        TrashIcon,
    ],
    templateUrl: './timeline-panel.html',
    styleUrl: './timeline-panel.css',
    host: { '[style.--branch-columns]': 'headings().length' },
})
export class TimelinePanel {
    private readonly viewport = viewChild(CdkVirtualScrollViewport);
    private lastScrollTop = 0;
    /** How far the rows are scrolled sideways, which the headings follow. */
    private readonly scrollLeft = signal(0);
    /** Where the commit shown is among the rows, which following keeps in sight. */
    /** The commit shown, or, zoomed out, the deepest group holding it. */
    private readonly shownIndex = computed(() =>
        this.rows().findLastIndex((row) =>
            row.cells.some((cell) => cell.isShown || cell.hasShown),
        ),
    );
    private readonly selectedIndex = computed(() =>
        this.rows().findIndex((row) => row.cells.some((cell) => cell.isSelected)),
    );
    protected readonly rowHeight = ROW_HEIGHT_PX;
    protected readonly viewButtons = VIEW_BUTTONS;
    protected readonly kindButtons = KIND_BUTTONS;
    protected readonly thresholds = THRESHOLDS;
    protected readonly displays = GapDisplay;
    /** Each gap row's height on the axis, by its ID; every other row is one row high. */
    protected readonly gapHeights = computed(() => {
        const rows = this.rows();
        const display = this.gapDisplay();
        const threshold = this.gapThresholdMs();
        return gapHeights(rows, display, threshold, ROW_HEIGHT_PX);
    });
    /** Where each row starts, which the virtual scroll draws from. */
    protected readonly offsets = computed(() => {
        const rows = this.rows();
        const heights = this.gapHeights();
        return rowOffsets(rows, heights, ROW_HEIGHT_PX);
    });
    protected readonly views = TimelineView;
    protected readonly nodeKinds = NodeKind;
    protected readonly zoomLevels = Object.values(TimelineZoom);
    protected readonly isFollowing = signal(true);
    protected readonly headingsShift = computed(() => `translateX(${-this.scrollLeft()}px)`);
    /** The time and group heading stays put while the headings move. */
    protected readonly labelShift = computed(() => `translateX(${this.scrollLeft()}px)`);
    /** The branch whose name is being edited, if any. */
    protected readonly editing = signal<BranchId | null>(null);
    /** The branch the page asks about deleting, if any (FND-81). */
    protected readonly deleting = signal<BranchId | null>(null);
    readonly headings = input.required<readonly IColumnHeading[]>();
    readonly rows = input.required<readonly ITimelineRowView[]>();
    readonly view = input.required<TimelineView>();
    readonly zoom = input.required<TimelineZoom>();
    /** The kinds of commit the filter hides (FND-81). */
    readonly hiddenKinds = input<ReadonlySet<CommitKind>>(NO_HIDDEN_KINDS);
    /** How long a gap must be to show, in simulated milliseconds (FND-81). */
    readonly gapThresholdMs = input<number>(MS_PER_MINUTE);
    /** Whether gaps show as rows stating them, or as space to scale (FND-81). */
    readonly gapDisplay = input<GapDisplay>(GapDisplay.List);
    /** The height of the region it sits in, so it can adjust when that is resized. */
    readonly heightPx = input<number>(0);
    readonly openOrClose = output<INodeToggle>();
    readonly choose = output<ITimelineChoice>();
    readonly viewTo = output<TimelineView>();
    /** Selects an order or a driver, or clears it, which every view highlights (FND-81). */
    readonly selectSubject = output<ISubjectChoice>();
    readonly zoomTo = output<TimelineZoom>();
    /** Shows or hides one kind of commit. */
    readonly toggleKind = output<CommitKind>();
    /** Shows only the gaps longer than a threshold, in simulated milliseconds. */
    readonly thresholdTo = output<number>();
    /** Shows gaps as rows, or as space to scale. */
    readonly displayTo = output<GapDisplay>();
    readonly watch = output<BranchId>();
    /** Forks at a fork point: a branch begins after that commit (FND-87). */
    readonly forkAt = output<ITimelineChoice>();
    readonly rename = output<IBranchRename>();
    /** Deletes a branch with no forks of its own, never Main, once confirmed (FND-81). */
    readonly deleteBranch = output<BranchId>();
    /** The kinds a breakpoint on the kind alone is on for, which show their dot filled. */
    readonly kindsPausedAt = input<ReadonlySet<string>>(NO_KINDS);
    /** Pauses the run at every event of a kind, or stops doing so (FND-88). */
    readonly pauseOnKind = output<string>();

    constructor() {
        afterRenderEffect(() => {
            this.heightPx();
            this.viewport()?.checkViewportSize();
        });
        // Virtual scrolling grows its height a render after the rows arrive, so this checks after
        // each render.
        afterEveryRender(() => {
            const index = this.shownIndex();
            if (this.isFollowing() && index >= 0) {
                this.scrollTo(index);
            }
        });
        afterRenderEffect(() => {
            const index = this.selectedIndex();
            const viewport = this.viewport();
            if (index < 0 || viewport === undefined) {
                return;
            }
            const { start, end } = viewport.getRenderedRange();
            if (index < start || index >= end) {
                this.scrollTo(index);
            }
        });
    }

    protected pauseLabel(kind: string): string {
        const kinds = this.kindsPausedAt();
        return kinds.has(kind)
            ? `Stop pausing at every ${kind}`
            : `Pause the run at every ${kind}`;
    }

    protected zoomLabel(level: TimelineZoom): string {
        const view = this.view();
        return zoomLabel(level, view);
    }

    /** What a filter button does: show its kind's commits, or hide them. */
    protected kindTooltip(button: IKindButton): string {
        const isHidden = this.hiddenKinds().has(button.kind);
        const what = button.label === 'State' ? 'state commits' : button.label.toLowerCase();
        return isHidden
            ? `Show ${what} on the timeline, in every view`
            : `Hide ${what} on the timeline, in every view`;
    }

    protected zoomTooltip(level: TimelineZoom): string {
        const label = this.zoomLabel(level);
        return level === TimelineZoom.Commits
            ? 'Open every group, down to the commits'
            : `Show the timeline by ${label.toLowerCase()}, each a summary you can open`;
    }

    /** A gap row's height on the axis, for its style, or null for one row's height. */
    protected gapHeight(row: ITimelineRowView): string | null {
        const height = this.gapHeights().get(row.id);
        return height === undefined ? null : `${height}px`;
    }

    protected chooseThreshold(value: string): void {
        const ms = Number(value);
        this.thresholdTo.emit(ms);
    }

    protected trackRow(_index: number, row: ITimelineRowView): string {
        return row.id;
    }

    protected chooseCell(cell: ITimelineCell): void {
        if (cell.place === null) {
            return;
        }
        this.stopFollowing();
        this.choose.emit({ branch: cell.column, place: cell.place, sequence: cell.sequence });
    }

    protected forkCell(cell: ITimelineCell): void {
        if (cell.place === null) {
            return;
        }
        this.stopFollowing();
        this.forkAt.emit({ branch: cell.column, place: cell.place, sequence: null });
    }

    /** What the highlight button on an order's or a driver's row does. */
    protected highlightLabel(row: ITimelineRowView): string {
        return row.isHighlighted
            ? `Stop highlighting ${row.label}`
            : `Highlight ${row.label} in every view, and show its versions`;
    }

    protected chooseSubject(row: ITimelineRowView): void {
        if (row.subject !== null) {
            this.selectSubject.emit({ kind: row.kind, key: row.key, subject: row.subject });
        }
    }

    protected toggleRow(row: ITimelineRowView): void {
        this.stopFollowing();
        this.openOrClose.emit({ key: row.key, isOpen: row.isOpen });
    }

    /** Runs on the press, not the click: a row that moves before the release gets no click. */
    protected stopFollowing(): void {
        this.isFollowing.set(false);
    }

    protected follow(): void {
        this.isFollowing.set(true);
    }

    /**
     * Scrolling up means someone is looking back, so it stops following. Following itself only
     * scrolls to the commit shown.
     */
    protected noticeScroll(): void {
        const viewport = this.viewport();
        const left = viewport?.measureScrollOffset('left') ?? 0;
        this.scrollLeft.set(left);
        const top = viewport?.measureScrollOffset('top') ?? 0;
        if (top < this.lastScrollTop) {
            this.isFollowing.set(false);
        }
        this.lastScrollTop = top;
    }

    /** Watches a heading's branch; the one watched already stays as it is. */
    protected watchBranch(heading: IColumnHeading): void {
        if (!heading.isCurrent) {
            this.watch.emit(heading.id);
        }
    }

    protected startRenaming(heading: IColumnHeading): void {
        this.editing.set(heading.id);
    }

    protected saveName(heading: IColumnHeading, name: string): void {
        this.rename.emit({ id: heading.id, name });
        this.editing.set(null);
    }

    protected stopRenaming(): void {
        this.editing.set(null);
    }

    protected askToDelete(heading: IColumnHeading): void {
        this.editing.set(null);
        this.deleting.set(heading.id);
    }

    protected confirmDelete(heading: IColumnHeading): void {
        this.deleting.set(null);
        this.deleteBranch.emit(heading.id);
    }

    /**
     * Scrolls to a row, and notes where that left the list: following can scroll up, as the commit
     * shown can move back, and only scrolling up past where it left the list stops following.
     */
    private scrollTo(index: number): void {
        const viewport = this.viewport();
        viewport?.scrollToIndex(index);
        this.lastScrollTop = viewport?.measureScrollOffset('top') ?? 0;
    }
}
