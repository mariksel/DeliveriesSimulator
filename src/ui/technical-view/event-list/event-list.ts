import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
    afterEveryRender,
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import type { List } from 'immutable';

import type { RunLogEntry } from '../../../application-core/simulation-engine/run-log-entry';
import { ColumnHeadings } from '../column-headings/column-headings';
import { ColumnWidthStore } from '../column-width-store';
import type { IColumn } from '../column-widths';
import { columnsTemplate } from '../column-widths';
import type { IEventRow } from '../event-views';
import { eventRow } from '../event-views';
import { Tooltip } from '../../shell/tooltip/tooltip';
import { BreakpointIcon } from '../../shell/icons/breakpoint-icon';

/** The height of one row, which virtual scrolling needs to know. The stylesheet sets the same. */
const ROW_HEIGHT_PX = 26;

const COLUMN_GROUP = 'event-list';

/** No kinds: what a list shows before any breakpoint is set. */
const NO_KINDS: ReadonlySet<string> = new Set();

const COLUMNS: readonly IColumn[] = [
    { key: 'sequence', label: '#', startPx: 36, isNumber: true },
    { key: 'time', label: 'Time', startPx: 110 },
    { key: 'source', label: 'Source', startPx: 80 },
    { key: 'kind', label: 'Kind', startPx: 220 },
    { key: 'order', label: 'Order', startPx: 70 },
    { key: 'causedBy', label: 'Caused by', startPx: 70, isNumber: true },
];

/**
 * Every entry of a run's log, oldest first. It follows the newest until someone looks elsewhere.
 */
@Component({
    selector: 'app-event-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BreakpointIcon, ColumnHeadings, ScrollingModule, Tooltip],
    templateUrl: './event-list.html',
    styleUrl: './event-list.css',
    host: { '[style.--table-columns]': 'template()' },
})
export class EventList {
    private readonly viewport = viewChild(CdkVirtualScrollViewport);
    private readonly widths = inject(ColumnWidthStore);
    private lastScrollTop = 0;
    protected readonly rowHeight = ROW_HEIGHT_PX;
    protected readonly group = COLUMN_GROUP;
    protected readonly columns = COLUMNS;
    protected readonly template = computed(() => {
        const widths = this.widths.widthsIn(COLUMN_GROUP);
        return columnsTemplate(COLUMNS, widths);
    });
    protected readonly isFollowing = signal(true);
    protected readonly rows = computed(() => this.entries().toArray());
    readonly entries = input.required<List<RunLogEntry>>();
    readonly selected = input<number | null>(null);
    /**
     * How many entries the log held at the place shown: later ones are dimmed, as they had not
     * happened yet (FND-86). Null shows them all as written.
     */
    readonly shownCount = input<number | null>(null);
    /** The height of the region it sits in, so it can adjust when that is resized. */
    readonly heightPx = input<number>(0);
    readonly choose = output<number>();
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
            const lastRow = this.rows().length - 1;
            if (this.isFollowing() && lastRow >= 0) {
                this.viewport()?.scrollToIndex(lastRow);
            }
        });
        afterRenderEffect(() => {
            const chosen = this.selected();
            const viewport = this.viewport();
            if (chosen === null || viewport === undefined) {
                return;
            }
            const { start, end } = viewport.getRenderedRange();
            if (chosen < start || chosen >= end) {
                viewport.scrollToIndex(chosen);
            }
        });
    }

    protected pauseLabel(kind: string): string {
        const kinds = this.kindsPausedAt();
        return kinds.has(kind)
            ? `Stop pausing at every ${kind}`
            : `Pause the run at every ${kind}`;
    }

    protected rowOf(entry: RunLogEntry): IEventRow {
        const logEntries = this.entries();
        return eventRow(entry, logEntries);
    }

    /** Runs on the press, not the click: a row that moves before the release gets no click. */
    protected stopFollowing(): void {
        this.isFollowing.set(false);
    }

    protected chooseRow(sequence: number): void {
        this.stopFollowing();
        this.choose.emit(sequence);
    }

    protected follow(): void {
        this.isFollowing.set(true);
    }

    /**
     * Scrolling up means someone is looking back, so it stops following. Following itself only
     * scrolls down.
     */
    protected noticeScroll(): void {
        const top = this.viewport()?.measureScrollOffset('top') ?? 0;
        if (top < this.lastScrollTop) {
            this.isFollowing.set(false);
        }
        this.lastScrollTop = top;
    }
}
