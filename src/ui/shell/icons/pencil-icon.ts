import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A pencil, for the controls that rename something. */
@Component({
    selector: 'app-pencil-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './pencil-icon.html',
    styleUrl: './fork-icon.css',
})
export class PencilIcon {}
