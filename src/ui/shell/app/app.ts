import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { StatusBar } from '../../workspace/status-bar/status-bar';
import { SECTIONS } from '../sections';
import { Tooltip } from '../tooltip/tooltip';

/**
 * The application's shell: the sections on the left, the current one beside them, and the status
 * bar.
 */
@Component({
    selector: 'app-root',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, RouterLinkActive, RouterOutlet, StatusBar, Tooltip],
    templateUrl: './app.html',
    styleUrl: './app.css',
})
export class App {
    protected readonly sections = SECTIONS;
}
