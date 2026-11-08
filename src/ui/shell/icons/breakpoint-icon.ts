import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A breakpoint's dot, filled while one is set, for the controls that set them (FND-88). */
@Component({
    selector: 'app-breakpoint-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './breakpoint-icon.html',
    styleUrl: './breakpoint-icon.css',
    host: { '[class.is-set]': 'isSet()' },
})
export class BreakpointIcon {
    readonly isSet = input(false);
}
