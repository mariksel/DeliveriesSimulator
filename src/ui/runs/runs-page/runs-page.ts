import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import type { OpenResult } from '../../../application/verification/run-session';
import { BuiltInScenarios } from '../../../application-core/scenarios/built-in-scenarios';
import { WatchedRunStore } from '../../workspace/watched-run-store';
import type { BuiltInScenarioId } from '../../../application-core/scenarios/built-in-scenarios';
import { Tooltip } from '../../shell/tooltip/tooltip';

/** Picks a scenario to run. Picking one opens the run workspace, paused at time 0. */
@Component({
    selector: 'app-runs-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './runs-page.html',
    styleUrl: './runs-page.css',
})
export class RunsPage {
    private readonly store = inject(WatchedRunStore);
    private readonly router = inject(Router);
    protected readonly builtIn = inject(BuiltInScenarios).list();
    protected readonly problems = signal<readonly string[]>([]);
    protected readonly isDragging = signal(false);

    protected async openBuiltIn(id: BuiltInScenarioId): Promise<void> {
        const openBuiltIn = this.store.openBuiltIn(id);
        await this.follow(openBuiltIn);
    }

    protected async openChosenFile(files: FileList | null): Promise<void> {
        const file = files?.[0];
        if (file !== undefined) {
            const openFile = await this.store.openFile(file);
            await this.follow(openFile);
        }
    }

    /** Without this, the browser opens a dropped file itself. */
    protected dragOver(event: DragEvent): void {
        event.preventDefault();
        this.isDragging.set(true);
    }

    protected async dropFile(event: DragEvent): Promise<void> {
        event.preventDefault();
        this.isDragging.set(false);
        await this.openChosenFile(event.dataTransfer?.files ?? null);
    }

    private async follow(result: OpenResult): Promise<void> {
        if (result.isOk) {
            this.problems.set([]);
            await this.router.navigateByUrl('/runs/live');
        } else {
            const problems = result.problems
                .map(({ path, message }) => `${path}: ${message}`)
                .toArray();
            this.problems.set(problems);
        }
    }
}
