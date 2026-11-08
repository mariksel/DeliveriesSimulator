import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { IModuleRulesView, IParameterView, IRuleEdit, IRuleEditProblem } from '../rules-view';
import { Tooltip } from '../../shell/tooltip/tooltip';

/**
 * The Rules panel: each module's rules, what they say, where they come from, and their values in
 * use, which a person can change while the run is paused or running (FND-84).
 */
@Component({
    selector: 'app-rules-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './rules-panel.html',
    styleUrl: './rules-panel.css',
})
export class RulesPanel {
    readonly modules = input.required<readonly IModuleRulesView[]>();
    readonly problem = input<IRuleEditProblem | null>(null);
    readonly edit = output<IRuleEdit>();

    protected setValue(parameter: IParameterView, text: string): void {
        this.edit.emit({ ruleId: parameter.ruleId, parameterId: parameter.parameterId, text });
    }
}
