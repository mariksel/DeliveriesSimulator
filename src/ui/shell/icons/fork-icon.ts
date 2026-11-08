import { ChangeDetectionStrategy, Component } from '@angular/core';

/** A fork: a line that splits in two, for the controls that start a new branch (FND-87). */
@Component({
    selector: 'app-fork-icon',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './fork-icon.html',
    styleUrl: './fork-icon.css',
})
export class ForkIcon {}
