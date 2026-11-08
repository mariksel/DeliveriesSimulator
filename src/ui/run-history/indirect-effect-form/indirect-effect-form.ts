import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
    signal,
} from '@angular/core';

import type { IndirectStatement } from '../../../application-core/simulation-engine/indirect-effect';
import { IndirectKind } from '../../../application-core/simulation-engine/indirect-effect';
import { Tooltip } from '../../shell/tooltip/tooltip';
import type { IIndirectNames } from './indirect-statement';
import {
    actorsFor,
    choiceOf,
    FIRST_CHOICE,
    INDIRECT_CHOICES,
    indirectStatementOf,
} from './indirect-statement';

/**
 * A short form to state an indirect effect at the commit shown: a decision or change outside the
 * service, which it does not see (FND-89).
 */
@Component({
    selector: 'app-indirect-effect-form',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './indirect-effect-form.html',
    styleUrl: './indirect-effect-form.css',
})
export class IndirectEffectForm {
    protected readonly choices = INDIRECT_CHOICES;
    protected readonly kind = signal<IndirectKind>(FIRST_CHOICE.kind);
    protected readonly problem = signal<string | null>(null);
    protected readonly actors = computed(() => {
        const kind = this.kind();
        const names = this.names();
        return actorsFor(kind, names);
    });
    protected readonly hasActor = computed(() => {
        const kind = this.kind();
        return choiceOf(kind).actors !== null;
    });
    protected readonly isLate = computed(() => this.kind() === IndirectKind.RestaurantRunsLate);
    readonly names = input.required<IIndirectNames>();
    readonly stated = output<IndirectStatement>();
    readonly closed = output();

    protected chooseKind(kind: string): void {
        const choice = choiceOf(kind);
        this.kind.set(choice.kind);
        this.problem.set(null);
    }

    protected state(event: SubmitEvent, actor: string, order: string, lateBy: string): void {
        event.preventDefault();
        const kind = this.kind();
        const result = indirectStatementOf({ kind, actor, order, lateBy });
        if (!result.isOk) {
            this.problem.set(result.problem);
            return;
        }
        this.problem.set(null);
        this.stated.emit(result.statement);
    }
}
