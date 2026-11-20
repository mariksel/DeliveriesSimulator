import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { toCount } from '../../../domain/system/math/math';
import type { OpenResult } from '../../../application/verification/run-session';
import { BuiltInScenarios } from '../../../application-core/scenarios/built-in-scenarios';
import { WatchedRunStore } from '../../workspace/watched-run-store';
import type { BuiltInScenarioId } from '../../../application-core/scenarios/built-in-scenarios';
import { Tooltip } from '../../shell/tooltip/tooltip';
import type { ILoadProgress, SavedRunId } from '../../../application-core/run-history/saved-run';
import { RunLevel } from '../../../application-core/run-history/saved-run';
import type { ISavedRunRow, ISnapshotLine } from './saved-run-row';
import { savedRunRow, snapshotLines } from './saved-run-row';

/** What a person can do to a saved run that asks them first, in the page (FND-81). */
const SavedRunAction = {
    Open: 'Open',
    Move: 'Move',
    Delete: 'Delete',
} as const;

/** One of the values of {@link SavedRunAction}. */
type SavedRunAction = (typeof SavedRunAction)[keyof typeof SavedRunAction];

/** An action on a saved run waiting for a person to confirm it, and what the page asks. */
interface IPending {
    readonly id: SavedRunId;
    readonly action: SavedRunAction;
    readonly question: string;
    readonly confirmLabel: string;
}

/** A saved run as its row shows it, with its ID. */
interface ISavedRunItem {
    readonly id: SavedRunId;
    readonly row: ISavedRunRow;
}

/** How far opening a saved run has got, shown on its row. */
interface IOpening extends ILoadProgress {
    readonly id: SavedRunId;
}

/** What a saved run's snapshot tests found, shown on its row. */
interface ISnapshotShown {
    readonly id: SavedRunId;
    readonly lines: readonly ISnapshotLine[];
}

/** Why the last action on a saved run did nothing, shown on its row. */
interface IRowProblem {
    readonly id: SavedRunId;
    readonly message: string;
}

const OPEN_QUESTION =
    'The run being watched has changes that are not saved. Open this one in its place?';
const TO_MINIMUM_QUESTION =
    'Keep only the minimum? It takes less room, and opening it then takes about as long as running it.';
const TO_EVERYTHING_QUESTION =
    'Keep everything? Every commit is worked out again now, which takes about as long as running it, and it takes more room.';

/**
 * Picks a scenario to run, which opens the run workspace paused at time 0, or a saved run, which
 * opens it paused at the saved run's latest commit (FND-81).
 */
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
    protected readonly savedRuns = computed<readonly ISavedRunItem[]>(() =>
        this.store.savedRuns().map((saved) => ({ id: saved.id, row: savedRunRow(saved) })),
    );
    protected readonly pending = signal<IPending | null>(null);
    protected readonly opening = signal<IOpening | null>(null);
    protected readonly rowProblem = signal<IRowProblem | null>(null);
    /** The saved run whose snapshot tests are running, if any. */
    protected readonly testing = signal<SavedRunId | null>(null);
    /** What the last snapshot tests of a saved run found, shown on its row. */
    protected readonly snapshot = signal<ISnapshotShown | null>(null);

    constructor() {
        void this.store.refreshSavedRuns();
    }

    /** Opens a saved run, asking first when the run being watched has changes not saved. */
    protected async askToOpen(id: SavedRunId): Promise<void> {
        this.rowProblem.set(null);
        if (!this.store.isUnsaved()) {
            await this.open(id);
            return;
        }
        this.pending.set({
            id,
            action: SavedRunAction.Open,
            question: OPEN_QUESTION,
            confirmLabel: 'Open anyway',
        });
    }

    protected askToMove(id: SavedRunId, row: ISavedRunRow): void {
        this.rowProblem.set(null);
        const isToMinimum = row.otherLevel === RunLevel.Minimum;
        this.pending.set({
            id,
            action: SavedRunAction.Move,
            question: isToMinimum ? TO_MINIMUM_QUESTION : TO_EVERYTHING_QUESTION,
            confirmLabel: row.moveLabel,
        });
    }

    protected askToDelete(id: SavedRunId, row: ISavedRunRow): void {
        this.rowProblem.set(null);
        this.pending.set({
            id,
            action: SavedRunAction.Delete,
            question: `Delete “${row.name}”? It cannot be brought back.`,
            confirmLabel: 'Delete',
        });
    }

    /** Runs both snapshot tests of a saved run, and shows what they found on its row. */
    protected async snapshotTest(id: SavedRunId): Promise<void> {
        this.rowProblem.set(null);
        this.snapshot.set(null);
        this.testing.set(id);
        try {
            const results = await this.store.snapshotTestSaved(id);
            if (results !== undefined) {
                const lines = snapshotLines(results);
                this.snapshot.set({ id, lines });
            }
        } finally {
            this.testing.set(null);
        }
    }

    /** Does what the page asked about, now that the person confirmed it. */
    protected async confirm(row: ISavedRunRow): Promise<void> {
        const pending = this.pending();
        this.pending.set(null);
        if (pending === null) {
            return;
        }
        if (pending.action === SavedRunAction.Open) {
            await this.open(pending.id);
        } else if (pending.action === SavedRunAction.Move) {
            await this.move(pending.id, row.otherLevel);
        } else {
            await this.store.deleteSaved(pending.id);
        }
    }

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

    private async open(id: SavedRunId): Promise<void> {
        this.opening.set({ id, done: toCount(0), total: toCount(0) });
        const opened = await this.store.openSaved(id, (progress) => {
            this.opening.set({ id, ...progress });
        });
        this.opening.set(null);
        if (opened.isOk) {
            await this.router.navigateByUrl('/runs/live');
        } else {
            this.rowProblem.set({ id, message: opened.message });
        }
    }

    private async move(id: SavedRunId, level: RunLevel): Promise<void> {
        const moved = await this.store.moveSaved(id, level);
        if (moved?.isOk === false) {
            this.rowProblem.set({ id, message: moved.message });
        }
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
