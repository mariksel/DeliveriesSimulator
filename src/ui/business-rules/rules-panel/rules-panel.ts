import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import type {
    IFunctionChoice,
    IFunctionView,
    IModuleRulesView,
    IParameterView,
    IRuleEdit,
    IRuleEditProblem,
} from '../rules-view';
import { Tooltip } from '../../shell/tooltip/tooltip';

/**
 * The Rules panel: each module's rules, what they say, where they come from, and their values in
 * use, which a person can change while the run is paused or running (FND-84), and each module's
 * state functions, with the version in use, which a person can switch (FND-81).
 */
@Component({
    selector: 'app-rules-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    templateUrl: './rules-panel.html',
    styleUrl: './rules-panel.css',
})
export class RulesPanel {
    /** The label the next change follows from, or blank for none. */
    protected readonly after = signal('');
    readonly modules = input.required<readonly IModuleRulesView[]>();
    /**
     * The labels of the scenario's indirect effects made by the commit shown, which a change can
     * follow from (FND-89).
     */
    readonly labels = input<readonly string[]>([]);
    readonly problem = input<IRuleEditProblem | null>(null);
    readonly edit = output<IRuleEdit>();
    /** Switches a function to another of its versions (FND-81). */
    readonly use = output<IFunctionChoice>();

    /** Switches a function to the version chosen, following from the label chosen, if any. */
    protected useVersion(view: IFunctionView, text: string): void {
        const version = view.versions.find((each) => String(each) === text);
        if (version === undefined || version === view.inUse) {
            return;
        }
        const after = this.after();
        const isFollowing = after !== '' && this.labels().includes(after);
        const follows = isFollowing ? { after } : {};
        this.use.emit({ function: view.name, version, ...follows });
    }

    protected setValue(parameter: IParameterView, text: string): void {
        const after = this.after();
        const isFollowing = after !== '' && this.labels().includes(after);
        const follows = isFollowing ? { after } : {};
        this.edit.emit({
            ruleId: parameter.ruleId,
            parameterId: parameter.parameterId,
            text,
            ...follows,
        });
    }
}
