import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { RunLevel } from '../../../application-core/run-history/saved-run';
import { Tooltip } from '../../shell/tooltip/tooltip';

/** What a person chose to save the run as. */
export interface ISaveChoice {
    readonly name: string;
    readonly level: RunLevel;
}

/** How each level is offered. */
const LEVELS: readonly { readonly level: RunLevel; readonly label: string }[] = [
    { level: RunLevel.Everything, label: 'Everything: opens fast' },
    { level: RunLevel.Minimum, label: 'Minimum: smaller, opens by running it again' },
];

/**
 * A short form to save the run being watched, under a name, at a level (FND-81). A run that does
 * not fit says so, and is offered at "minimum".
 */
@Component({
    selector: 'app-save-run-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './save-run-form.html',
    styleUrl: './save-run-form.css',
})
export class SaveRunForm {
    protected readonly levels = LEVELS;
    protected readonly level = signal<RunLevel>(RunLevel.Everything);
    protected readonly nameProblem = signal<string | null>(null);
    protected readonly minimum = RunLevel.Minimum;
    /** The name offered: the scenario's name and the date. */
    readonly defaultName = input.required<string>();
    /** Why the last save stored nothing, if it did not. */
    readonly problem = input<string | null>(null);
    /** Whether a save is under way, during which the form waits. */
    readonly isSaving = input(false);
    readonly saved = output<ISaveChoice>();
    readonly closed = output();

    protected chooseLevel(text: string): void {
        const chosen = LEVELS.find((each) => each.level === text);
        this.level.set(chosen?.level ?? RunLevel.Everything);
    }

    protected save(event: SubmitEvent, name: string): void {
        event.preventDefault();
        const level = this.level();
        this.saveAt(name, level);
    }

    /** Saves at "minimum", as offered when the run did not fit at "everything". */
    protected saveAtMinimum(name: string): void {
        this.level.set(RunLevel.Minimum);
        this.saveAt(name, RunLevel.Minimum);
    }

    private saveAt(name: string, level: RunLevel): void {
        const trimmed = name.trim();
        if (trimmed === '') {
            this.nameProblem.set('A saved run needs a name.');
            return;
        }
        this.nameProblem.set(null);
        this.saved.emit({ name: trimmed, level });
    }
}
