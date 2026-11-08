import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { WatchedRunStore } from '../watched-run-store';

/** Always shows where the current run has got to. */
@Component({
    selector: 'app-status-bar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './status-bar.html',
    styleUrl: './status-bar.css',
})
export class StatusBar {
    protected readonly view = inject(WatchedRunStore).view;
}
