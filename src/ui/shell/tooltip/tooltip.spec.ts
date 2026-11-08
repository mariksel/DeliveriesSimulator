import { ApplicationRef, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tooltip, TOOLTIP_DELAY_MS } from './tooltip';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [Tooltip],
    template: '<button type="button" [appTooltip]="text()">Go</button>',
})
class Host {
    readonly text = signal('Start the run');
}

/** The texts of the tooltips showing, wherever the overlay put them. */
function shownTexts(): string[] {
    const bubbles = document.querySelectorAll<HTMLElement>('[role="tooltip"]');
    return [...bubbles].map((bubble) => bubble.textContent.trim());
}

/** A control with a tooltip, rendered, with the tooltip's delay under the test's control. */
async function control(text = 'Start the run'): Promise<HTMLButtonElement> {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.text.set(text);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const button = host.querySelector('button');
    if (button === null) {
        throw new Error('The host has no button.');
    }
    // Faked only now: Angular's own scheduling waits on real timers while the host renders.
    vi.useFakeTimers();
    return button;
}

/** Waits out the tooltip's delay, then renders what it showed. */
function waitOut(): void {
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    const app = TestBed.inject(ApplicationRef);
    app.tick();
}

/** Rests on the control with an event until its tooltip shows. */
function rest(button: HTMLButtonElement, event = 'mouseenter'): void {
    const resting = new Event(event);
    button.dispatchEvent(resting);
    waitOut();
}

describe('the tooltip', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows what a control does once the pointer rests on it, and names it for assistive technology', async () => {
        const button = await control();
        const entering = new Event('mouseenter');

        button.dispatchEvent(entering);
        vi.advanceTimersByTime(TOOLTIP_DELAY_MS - 1);
        const early = shownTexts();
        vi.advanceTimersByTime(1);
        const app = TestBed.inject(ApplicationRef);
        app.tick();

        expect(early).toEqual([]);
        const shown = shownTexts();
        expect(shown).toEqual(['Start the run']);
        const bubble = document.querySelector('[role="tooltip"]');
        const describedBy = button.getAttribute('aria-describedby');
        expect(describedBy).toBe(bubble?.id);
    });

    it('shows on keyboard focus too', async () => {
        const button = await control();

        rest(button, 'focusin');

        const shown = shownTexts();
        expect(shown).toEqual(['Start the run']);
    });

    it.each(['mouseleave', 'focusout', 'pointerdown'])('goes on %s', async (event) => {
        const button = await control();
        rest(button);

        const leaving = new Event(event);
        button.dispatchEvent(leaving);
        const app = TestBed.inject(ApplicationRef);
        app.tick();

        const shown = shownTexts();
        expect(shown).toEqual([]);
        const isDescribed = button.hasAttribute('aria-describedby');
        expect(isDescribed).toBe(false);
    });

    it('goes on Escape', async () => {
        const button = await control();
        rest(button);

        const escape = new KeyboardEvent('keydown', { key: 'Escape' });
        button.dispatchEvent(escape);

        const shown = shownTexts();
        expect(shown).toEqual([]);
    });

    it('does not show when the pointer leaves before the delay', async () => {
        const button = await control();
        const entering = new Event('mouseenter');
        const leaving = new Event('mouseleave');

        button.dispatchEvent(entering);
        button.dispatchEvent(leaving);
        waitOut();

        const shown = shownTexts();
        expect(shown).toEqual([]);
    });

    it('shows nothing for a blank text', async () => {
        const button = await control('  ');

        rest(button);

        const shown = shownTexts();
        expect(shown).toEqual([]);
    });

    it('goes when its control does', async () => {
        const button = await control();
        rest(button);

        TestBed.resetTestingModule();

        const shown = shownTexts();
        expect(shown).toEqual([]);
    });
});
