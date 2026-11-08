import type { OverlayRef } from '@angular/cdk/overlay';
import {
    CdkOverlayOrigin,
    createFlexibleConnectedPositionStrategy,
    createOverlayRef,
    createRepositionScrollStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import type { OnDestroy } from '@angular/core';
import { Directive, inject, Injector, input, signal } from '@angular/core';

import { TooltipBubble } from './tooltip-bubble';

/** How long the pointer or the focus rests on a control before its tooltip shows. */
export const TOOLTIP_DELAY_MS = 400;

/** How far a tooltip sits from its control. */
const GAP_PX = 6;

/** Numbers each tooltip, so its control can name it. */
const TOOLTIPS_MADE = { count: 0 };

/**
 * Says what a control does, in the app's own tooltip: shown on hover and on keyboard focus after a
 * short delay, below the control or above it where there is no room, over any panel that scrolls,
 * and gone on leaving, on a click, or on Escape. Every control that does something has one
 * (FND-76).
 */
@Directive({
    selector: '[appTooltip]',
    hostDirectives: [CdkOverlayOrigin],
    host: {
        '(mouseenter)': 'showSoon()',
        '(mouseleave)': 'hide()',
        '(focusin)': 'showSoon()',
        '(focusout)': 'hide()',
        '(pointerdown)': 'hide()',
        '(keydown.escape)': 'hide()',
        '[attr.aria-describedby]': 'describedBy()',
    },
})
export class Tooltip implements OnDestroy {
    private readonly injector = inject(Injector);
    /** The control, which the CDK places the tooltip by. */
    private readonly origin = inject(CdkOverlayOrigin);
    private readonly id = `tooltip-${++TOOLTIPS_MADE.count}`;
    private overlay: OverlayRef | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    /** The tooltip's ID while it shows, so assistive technology reads it with the control. */
    protected readonly describedBy = signal<string | null>(null);
    /** What the control does. */
    readonly appTooltip = input.required<string>();

    ngOnDestroy(): void {
        this.hide();
        this.overlay?.dispose();
    }

    protected showSoon(): void {
        this.cancel();
        this.timer = setTimeout(() => {
            this.show();
        }, TOOLTIP_DELAY_MS);
    }

    protected hide(): void {
        this.cancel();
        if (this.overlay?.hasAttached() === true) {
            this.overlay.detach();
        }
        this.describedBy.set(null);
    }

    private show(): void {
        const text = this.appTooltip().trim();
        if (text === '') {
            return;
        }
        const overlay = this.overlay ?? this.createOverlay();
        this.overlay = overlay;
        if (overlay.hasAttached()) {
            return;
        }
        const portal = new ComponentPortal(TooltipBubble);
        const bubble = overlay.attach(portal);
        bubble.setInput('id', this.id);
        bubble.setInput('text', text);
        this.describedBy.set(this.id);
    }

    private createOverlay(): OverlayRef {
        const below = {
            originX: 'center',
            originY: 'bottom',
            overlayX: 'center',
            overlayY: 'top',
            offsetY: GAP_PX,
        } as const;
        const above = {
            originX: 'center',
            originY: 'top',
            overlayX: 'center',
            overlayY: 'bottom',
            offsetY: -GAP_PX,
        } as const;
        const placed = createFlexibleConnectedPositionStrategy(
            this.injector,
            this.origin.elementRef,
        );
        const positionStrategy = placed.withPositions([below, above]).withPush(true);
        const scrollStrategy = createRepositionScrollStrategy(this.injector);
        return createOverlayRef(this.injector, { positionStrategy, scrollStrategy });
    }

    private cancel(): void {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
