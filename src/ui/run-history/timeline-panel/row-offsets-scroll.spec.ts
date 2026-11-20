import type { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { describe, expect, it } from 'vitest';

import { RowOffsetsScrollStrategy, rowAt } from './row-offsets-scroll';

/** A range of rows drawn. */
interface IRange {
    readonly start: number;
    readonly end: number;
}

/** Rows of 30 px, with a 150 px gap row third. */
const OFFSETS = [0, 30, 60, 210, 240, 270, 300];

/** What a viewport was told, and the scroll it reports. */
interface IFakeViewport {
    readonly viewport: CdkVirtualScrollViewport;
    readonly told: {
        total: number;
        range: IRange | null;
        offset: number;
        scrolledTo: number | null;
    };
}

function fakeViewport(scrollTop: number, heightPx: number): IFakeViewport {
    const told = {
        total: 0,
        range: null as IRange | null,
        offset: 0,
        scrolledTo: null as number | null,
    };
    const fake = {
        setTotalContentSize: (size: number): void => {
            told.total = size;
        },
        setRenderedRange: (range: IRange): void => {
            told.range = range;
        },
        setRenderedContentOffset: (offset: number): void => {
            told.offset = offset;
        },
        scrollToOffset: (offset: number): void => {
            told.scrolledTo = offset;
        },
        getDataLength: (): number => OFFSETS.length - 1,
        measureScrollOffset: (): number => scrollTop,
        getViewportSize: (): number => heightPx,
    };
    return { viewport: fake as unknown as CdkVirtualScrollViewport, told };
}

describe('finding the row at a point', () => {
    it.each([
        [0, 0],
        [29, 0],
        [30, 1],
        [100, 2],
        [210, 3],
        [10_000, 5],
        [-50, 0],
    ])('at %s px is row %s', (point, row) => {
        const found = rowAt(OFFSETS, point);

        expect(found).toBe(row);
    });
});

describe('virtual scrolling with rows of varying height', () => {
    it('sizes the content by where the last row ends, and draws the rows in sight', () => {
        const strategy = new RowOffsetsScrollStrategy();
        const { viewport, told } = fakeViewport(0, 60);

        strategy.setOffsets(OFFSETS);
        strategy.attach(viewport);

        expect(told.total).toBe(300);
        expect(told.range).toEqual({ start: 0, end: 5 });
        expect(told.offset).toBe(0);
    });

    it('scrolls to where a row starts', () => {
        const strategy = new RowOffsetsScrollStrategy();
        const { viewport, told } = fakeViewport(0, 60);
        strategy.attach(viewport);
        strategy.setOffsets(OFFSETS);

        strategy.scrollToIndex(3, 'auto');

        expect(told.scrolledTo).toBe(210);
    });

    it('draws from the buffer above what is in sight once scrolled', () => {
        const strategy = new RowOffsetsScrollStrategy();
        const { viewport, told } = fakeViewport(270, 30);
        strategy.attach(viewport);
        strategy.setOffsets(OFFSETS);
        const firsts: number[] = [];
        strategy.scrolledIndexChange.subscribe((index) => firsts.push(index));

        strategy.onContentScrolled();
        strategy.onDataLengthChanged();
        strategy.onContentRendered();
        strategy.onRenderedOffsetChanged();
        strategy.detach();
        strategy.onContentScrolled();

        expect(told.range).toEqual({ start: 2, end: 6 });
        expect(told.offset).toBe(60);
        expect(firsts).toEqual([5]);
    });
});
