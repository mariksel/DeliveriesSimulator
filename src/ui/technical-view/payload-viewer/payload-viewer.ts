import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';

import { TextCopier } from '../../../application-core/technical-view/text-copier';
import type { RunLogEntry } from '../../../application-core/simulation-engine/run-log-entry';
import { payloadView } from '../event-views';
import { Tooltip } from '../../shell/tooltip/tooltip';

/** The Payload viewer: an entry's own facts, then its data, exactly as stored. */
@Component({
    selector: 'app-payload-viewer',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './payload-viewer.html',
    styleUrl: './payload-viewer.css',
})
export class PayloadViewer {
    private readonly copier = inject(TextCopier);
    /** The result of copying this entry: null until it has been tried. */
    private readonly copied = signal<{
        readonly sequence: number;
        readonly didCopy: boolean;
    } | null>(null);
    protected readonly view = computed(() => {
        const entry = this.entry();
        return payloadView(entry);
    });
    protected readonly copyMessage = computed(() => {
        const copied = this.copied();
        if (copied?.sequence !== this.entry().sequence) {
            return null;
        }
        return copied.didCopy ? 'Copied' : 'Could not copy';
    });
    readonly entry = input.required<RunLogEntry>();
    readonly choose = output<number>();
    readonly showTrace = output();

    protected async copy(): Promise<void> {
        const { sequence, json } = this.view();
        this.copied.set({ sequence, didCopy: await this.copier.copy(json) });
    }
}
