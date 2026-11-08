import { CdkDrag } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { ColumnWidthStore } from '../column-width-store';
import type { IColumn } from '../column-widths';
import { COLUMN_ARROW_STEP_PX, columnWidth, resizedColumn } from '../column-widths';
import { Tooltip } from '../../shell/tooltip/tooltip';

/**
 * A table's headings, each with an edge that can be dragged, or moved with the arrow keys, to
 * resize its column.
 */
@Component({
    selector: 'app-column-headings',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CdkDrag, Tooltip],
    templateUrl: './column-headings.html',
    styleUrl: './column-headings.css',
})
export class ColumnHeadings {
    private readonly store = inject(ColumnWidthStore);
    private dragStartPx = 0;
    /** Tables in the same group share their widths. */
    readonly group = input.required<string>();
    readonly columns = input.required<readonly IColumn[]>();

    protected startDrag(column: IColumn): void {
        this.dragStartPx = this.widthOf(column);
    }

    protected drag(column: IColumn, distanceX: number): void {
        const group = this.group();
        const px = resizedColumn(this.dragStartPx, distanceX);
        this.store.setWidth(group, column.key, px);
    }

    protected nudge(column: IColumn, direction: number): void {
        const width = this.widthOf(column);
        const px = resizedColumn(width, direction * COLUMN_ARROW_STEP_PX);
        const group = this.group();
        this.store.setWidth(group, column.key, px);
    }

    private widthOf(column: IColumn): number {
        const group = this.group();
        const widths = this.store.widthsIn(group);
        return columnWidth(column, widths);
    }
}
