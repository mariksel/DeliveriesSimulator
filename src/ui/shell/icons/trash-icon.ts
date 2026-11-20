import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A bin, for the controls that delete something. */
@Component({
    selector: 'app-trash-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './trash-icon.html',
    styleUrl: './fork-icon.css',
})
export class TrashIcon {}
