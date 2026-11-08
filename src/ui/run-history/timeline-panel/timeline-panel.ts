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
import { Tooltip } from '../../shell/tooltip/tooltip';
import type { ITimelineChoice } from '../../workspace/watched-run-store';
import { NodeKind, RowMode } from '../timeline-grid';
import type { IColumnHeading, ITimelineCell, ITimelineRowView } from '../timeline-view';
import { TimelineZoom, zoomLabel } from '../timeline-view';

/** No kinds: what the timeline shows before any breakpoint is set. */
const NO_KINDS: ReadonlySet<string> = new Set();

/** The height of one row, which virtual scrolling needs to know. The stylesheet sets the same. */
const ROW_HEIGHT_PX = 30;

/** A new name a person typed for a branch. */
export interface IBranchRename {
    readonly id: BranchId;
    readonly name: string;
}

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
    imports: [BreakpointIcon, ForkIcon, PencilIcon, ScrollingModule, Tooltip],
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
    protected readonly modes = RowMode;
    protected readonly nodeKinds = NodeKind;
    protected readonly zoomLevels = Object.values(TimelineZoom);
    protected readonly isFollowing = signal(true);
    protected readonly headingsShift = computed(() => `translateX(${-this.scrollLeft()}px)`);
    /** The time and group heading stays put while the headings move. */
    protected readonly labelShift = computed(() => `translateX(${this.scrollLeft()}px)`);
    /** The branch whose name is being edited, if any. */
    protected readonly editing = signal<BranchId | null>(null);
    readonly headings = input.required<readonly IColumnHeading[]>();
    readonly rows = input.required<readonly ITimelineRowView[]>();
    readonly rowMode = input.required<RowMode>();
    readonly zoom = input.required<TimelineZoom>();
    /** The height of the region it sits in, so it can adjust when that is resized. */
    readonly heightPx = input<number>(0);
    readonly openOrClose = output<INodeToggle>();
    readonly choose = output<ITimelineChoice>();
    readonly mode = output<RowMode>();
    readonly zoomTo = output<TimelineZoom>();
    readonly watch = output<BranchId>();
    /** Forks at a fork point: a branch begins after that commit (FND-87). */
    readonly forkAt = output<ITimelineChoice>();
    readonly rename = output<IBranchRename>();
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
        const mode = this.rowMode();
        return zoomLabel(level, mode);
    }

    protected zoomTooltip(level: TimelineZoom): string {
        const label = this.zoomLabel(level);
        return level === TimelineZoom.Commits
            ? 'Open every group, down to the commits'
            : `Show the timeline by ${label.toLowerCase()}, each a summary you can open`;
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
