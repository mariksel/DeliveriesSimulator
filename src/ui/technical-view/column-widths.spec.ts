import { describe, expect, it } from 'vitest';

import type { IColumn } from './column-widths';
import {
    columnsTemplate,
    columnWidth,
    MAX_COLUMN_PX,
    MIN_COLUMN_PX,
    resizedColumn,
} from './column-widths';

const KIND: IColumn = { key: 'kind', label: 'Kind', startPx: 100 };
const ORDER: IColumn = { key: 'order', label: 'Order', startPx: 50 };

describe('column widths', () => {
    it('starts a column at its own width', () => {
        const widths = new Map();
        const secondColumnWidth = columnWidth(KIND, widths);
        expect(secondColumnWidth).toBe(100);
    });

    it('uses the width someone gave it', () => {
        const widths = new Map([['kind', 180]]);
        const secondColumnWidth = columnWidth(KIND, widths);
        expect(secondColumnWidth).toBe(180);
    });

    it('moves a width by the change', () => {
        const secondResizedColumn = resizedColumn(100, 30);
        expect(secondResizedColumn).toBe(130);
        const thirdResizedColumn = resizedColumn(100, -30);
        expect(thirdResizedColumn).toBe(70);
    });

    it('keeps a width within its limits', () => {
        const secondResizedColumn = resizedColumn(100, -1000);
        expect(secondResizedColumn).toBe(MIN_COLUMN_PX);
        const thirdResizedColumn = resizedColumn(100, 1000);
        expect(thirdResizedColumn).toBe(MAX_COLUMN_PX);
    });

    it('lays out the columns in order, and leaves spare width to the end', () => {
        const widths = new Map([['order', 70]]);
        const secondColumnsTemplate = columnsTemplate([KIND, ORDER], widths);
        expect(secondColumnsTemplate).toBe('100px 70px minmax(0, 1fr)');
    });
});
