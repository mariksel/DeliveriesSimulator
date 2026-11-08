import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { List } from 'immutable';

import type { RunLogEntry } from '../../../application-core/simulation-engine/run-log-entry';
import {
    laneX,
    rowY,
    TRACE_LANE_PX,
    TRACE_LANES,
    TRACE_ROW_PX,
    traceLines,
    traceOf,
} from '../trace-views';
import { Tooltip } from '../../shell/tooltip/tooltip';

/**
 * A sequence diagram of the whole action the selected entry belongs to. Clicking a step selects
 * it.
 */
@Component({
    selector: 'app-trace-diagram',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './trace-diagram.html',
    styleUrl: './trace-diagram.css',
})
export class TraceDiagram {
    protected readonly lanes = TRACE_LANES;
    protected readonly laneX = laneX;
    protected readonly rowY = rowY;
    protected readonly lanesWidth = TRACE_LANES.length * TRACE_LANE_PX;
    protected readonly trace = computed(() => {
        const logEntries = this.entries();
        const selected = this.selected();
        return traceOf(logEntries, selected);
    });
    protected readonly lines = computed(() => traceLines(this.trace()?.steps ?? []));
    protected readonly height = computed(() => (this.trace()?.steps.length ?? 0) * TRACE_ROW_PX);
    readonly entries = input.required<List<RunLogEntry>>();
    readonly selected = input<number | null>(null);
    readonly choose = output<number>();
}
