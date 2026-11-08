import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import type { List } from 'immutable';

import type { RunLogEntry } from '../../../application-core/simulation-engine/run-log-entry';
import { InspectorTable } from '../inspector-table/inspector-table';
import { InspectorMode, inspectorTables, outboxRecords } from '../inspector-views';
import { Tooltip } from '../../shell/tooltip/tooltip';

/** The Outbox and inbox inspector: what each module has written and read, from the log alone. */
@Component({
    selector: 'app-outbox-inbox-inspector',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [InspectorTable, Tooltip],
    templateUrl: './outbox-inbox-inspector.html',
    styleUrl: './outbox-inbox-inspector.css',
})
export class OutboxInboxInspector {
    /** Works through the log only when the log changes, and not as time passes. */
    private readonly records = computed(() => {
        const logEntries = this.entries();
        return outboxRecords(logEntries);
    });
    protected readonly modes = InspectorMode;
    protected readonly tables = computed(() => {
        const records = this.records();
        const mode = this.mode();
        return inspectorTables(records, mode);
    });
    readonly entries = input.required<List<RunLogEntry>>();
    readonly now = input.required<number>();
    readonly selected = input<number | null>(null);
    readonly mode = model<InspectorMode>(InspectorMode.ByFlow);
    readonly choose = output<number>();
}
