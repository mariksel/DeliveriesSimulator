import type { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
import { Directive, effect, forwardRef, input } from '@angular/core';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, Subject } from 'rxjs';

/** Passes on the first row shown only when it changes. */
const untilChanged = distinctUntilChanged<number>();

/** How far past the viewport rows are drawn, above and below, in pixels. */
const BUFFER_PX = 200;

/** The index of the last row starting at or above a point, by halving: offsets only grow. */
export function rowAt(offsets: readonly number[], pointPx: number): number {
    let low = 0;
    let high = Math.max(0, offsets.length - 2);
    while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if ((offsets[middle] ?? 0) <= pointPx) {
            low = middle;
        } else {
            high = middle - 1;
        }
    }
    return low;
}

/**
 * Virtual scrolling for rows of varying height, from where each row starts: the timeline's axis
 * gives a gap row the space its gap is worth (FND-81). It draws the rows in sight and a buffer
 * around them, as the fixed-size strategy does for rows of one height.
 */
export class RowOffsetsScrollStrategy implements VirtualScrollStrategy {
    private readonly firstShown = new Subject<number>();
    private viewport: CdkVirtualScrollViewport | null = null;
    private offsets: readonly number[] = [0];

    readonly scrolledIndexChange: Observable<number> = this.firstShown.pipe(untilChanged);

    attach(viewport: CdkVirtualScrollViewport): void {
        this.viewport = viewport;
        this.update();
    }

    detach(): void {
        this.firstShown.complete();
        this.viewport = null;
    }

    /** Takes the rows' offsets afresh, as the rows or their heights changed. */
    setOffsets(offsets: readonly number[]): void {
        this.offsets = offsets;
        this.update();
    }

    onContentScrolled(): void {
        this.updateRange();
    }

    onDataLengthChanged(): void {
        this.update();
    }

    onContentRendered(): void {
        // Nothing to measure: every row's height is known.
    }

    onRenderedOffsetChanged(): void {
        // Nothing to do: the offset follows from the range drawn.
    }

    scrollToIndex(index: number, behavior: ScrollBehavior): void {
        const offset = this.offsets[index] ?? 0;
        this.viewport?.scrollToOffset(offset, behavior);
    }

    private update(): void {
        const viewport = this.viewport;
        if (viewport === null) {
            return;
        }
        const total = this.offsets.at(-1) ?? 0;
        viewport.setTotalContentSize(total);
        this.updateRange();
    }

    /** Draws the rows in sight, with a buffer above and below. */
    private updateRange(): void {
        const viewport = this.viewport;
        if (viewport === null) {
            return;
        }
        const dataLength = viewport.getDataLength();
        const length = Math.min(dataLength, this.offsets.length - 1);
        const top = viewport.measureScrollOffset();
        const size = viewport.getViewportSize();
        const firstShown = rowAt(this.offsets, top);
        const start = rowAt(this.offsets, top - BUFFER_PX);
        const last = rowAt(this.offsets, top + size + BUFFER_PX);
        const end = Math.min(length, last + 1);
        viewport.setRenderedRange({ start: Math.min(start, end), end });
        viewport.setRenderedContentOffset(this.offsets[start] ?? 0);
        this.firstShown.next(firstShown);
    }
}

/**
 * Gives a virtual scroll viewport rows of varying height, from where each starts, in place of
 * `itemSize`.
 */
@Directive({
    selector: 'cdk-virtual-scroll-viewport[appRowOffsets]',
    providers: [
        {
            provide: VIRTUAL_SCROLL_STRATEGY,
            useFactory: (directive: RowOffsets): VirtualScrollStrategy => directive.strategy,
            deps: [forwardRef(() => RowOffsets)],
        },
    ],
})
export class RowOffsets {
    readonly strategy = new RowOffsetsScrollStrategy();
    /** Where each row starts, and where the last ends. */
    readonly appRowOffsets = input.required<readonly number[]>();

    constructor() {
        effect(() => {
            const offsets = this.appRowOffsets();
            this.strategy.setOffsets(offsets);
        });
    }
}
