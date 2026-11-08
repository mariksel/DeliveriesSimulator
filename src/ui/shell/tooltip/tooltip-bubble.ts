import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The tooltip itself: a small label in the theme's colours, placed by {@link Tooltip}. */
@Component({
    selector: 'app-tooltip-bubble',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '<span class="bubble" role="tooltip" [id]="id()">{{ text() }}</span>',
    styleUrl: './tooltip-bubble.css',
})
export class TooltipBubble {
    readonly id = input.required<string>();
    readonly text = input.required<string>();
}
