import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Position } from '../../../domain/system/math/math';
import { Tooltip } from '../../shell/tooltip/tooltip';
import type { IRecordVersionsView, IVersionRow } from '../record-versions-view';

/**
 * The selected order's versions, in Orders and in Deliveries, as they stood at the commit shown,
 * each linked to the commit that made it (FND-81).
 */
@Component({
    selector: 'app-record-versions',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './record-versions.html',
    styleUrl: './record-versions.css',
})
export class RecordVersions {
    /** What is selected, such as Order order-1. */
    readonly title = input.required<string>();
    readonly views = input.required<readonly IRecordVersionsView[]>();
    /** Shows the commit that made a version. */
    readonly choosePlace = output<Position>();
    /** Clears the selection. */
    readonly clear = output();

    protected chooseRow(row: IVersionRow): void {
        if (row.place !== null) {
            this.choosePlace.emit(row.place);
        }
    }
}
