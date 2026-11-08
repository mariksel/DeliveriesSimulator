import { ScrollingModule } from '@angular/cdk/scrolling';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';

import { ColumnHeadings } from '../column-headings/column-headings';
import { ColumnWidthStore } from '../column-width-store';
import { columnsTemplate } from '../column-widths';
import type { IInspectorRow, IInspectorTable, IOutboxRecord } from '../inspector-views';
import { columnGroupOf, columnsOf, InspectorColumns, inspectorRow } from '../inspector-views';
import { Tooltip } from '../../shell/tooltip/tooltip';

const ROW_HEIGHT_PX = 26;

/** One table of outbox events. Only the rows in view work out their waiting time each moment. */
@Component({
    selector: 'app-inspector-table',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ColumnHeadings, ScrollingModule, Tooltip],
    templateUrl: './inspector-table.html',
    styleUrl: './inspector-table.css',
    host: { '[style.--table-columns]': 'template()' },
})
export class InspectorTable {
    private readonly widths = inject(ColumnWidthStore);
    protected readonly rowHeight = ROW_HEIGHT_PX;
    protected readonly columns = computed(() => columnsOf(this.table().columns));
    protected readonly group = computed(() => columnGroupOf(this.table().columns));
    protected readonly template = computed(() => {
        const columns = this.columns();
        const group = this.group();
        const widths = this.widths.widthsIn(group);
        return columnsTemplate(columns, widths);
    });
    protected readonly hasWritten = computed(() => this.table().columns !== InspectorColumns.Read);
    protected readonly hasRead = computed(() => this.table().columns !== InspectorColumns.Written);
    readonly table = input.required<IInspectorTable>();
    readonly now = input.required<number>();
    readonly selected = input<number | null>(null);
    readonly choose = output<number>();

    protected rowOf(record: IOutboxRecord): IInspectorRow {
        const now = this.now();
        return inspectorRow(record, now);
    }

    protected isSelected(record: IOutboxRecord): boolean {
        const selected = this.selected();
        return (
            selected !== null && (selected === record.sequence || selected === record.readSequence)
        );
    }
}
