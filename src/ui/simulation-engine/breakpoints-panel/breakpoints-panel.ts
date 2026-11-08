import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type {
    IBreakpoint,
    IBreakpointHit,
} from '../../../application-core/simulation-engine/breakpoints';
import { LogSource } from '../../../domain/event-log/log-vocabulary';
import { BreakpointIcon } from '../../shell/icons/breakpoint-icon';
import { Tooltip } from '../../shell/tooltip/tooltip';

/** A breakpoint someone asked for: an event kind, narrowed if wanted. */
export interface INewBreakpoint {
    readonly kind: string;
    readonly source: string | null;
    readonly order: string | null;
}

/** A breakpoint to switch on or off. */
export interface IBreakpointSwitch {
    readonly id: number;
    readonly isOn: boolean;
}

/**
 * The Breakpoints tab: the breakpoints the run pauses at, each with a switch and a remove icon,
 * a form to add one, and the one the run last stopped at (FND-88).
 */
@Component({
    selector: 'app-breakpoints-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [BreakpointIcon, Tooltip],
    templateUrl: './breakpoints-panel.html',
    styleUrl: './breakpoints-panel.css',
})
export class BreakpointsPanel {
    protected readonly sources = Object.values(LogSource);
    readonly breakpoints = input.required<readonly IBreakpoint[]>();
    readonly lastHit = input<IBreakpointHit | null>(null);
    /** The event kinds the run's log holds, offered when adding one. */
    readonly kinds = input<readonly string[]>([]);
    readonly add = output<INewBreakpoint>();
    readonly switchTo = output<IBreakpointSwitch>();
    readonly remove = output<number>();

    protected addBreakpoint(
        event: SubmitEvent,
        kind: string,
        source: string,
        order: string,
    ): void {
        event.preventDefault();
        const trimmedKind = kind.trim();
        if (trimmedKind === '') {
            return;
        }
        const trimmedOrder = order.trim();
        this.add.emit({
            kind: trimmedKind,
            source: source === '' ? null : source,
            order: trimmedOrder === '' ? null : trimmedOrder,
        });
    }

    /** What a breakpoint is narrowed to, in words. */
    protected narrowing(breakpoint: IBreakpoint): string {
        const source = breakpoint.source ?? 'any source';
        const order = breakpoint.order ?? 'any order';
        return `${source}, ${order}`;
    }

    protected switchLabel(breakpoint: IBreakpoint): string {
        return breakpoint.isOn
            ? `Switch the breakpoint on ${breakpoint.kind} off, keeping it`
            : `Switch the breakpoint on ${breakpoint.kind} on`;
    }
}
