import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ONE_ORDER_DIGEST } from '../../../../e2e/fixtures/one-order-digest';
import { RunWorkspace } from './run-workspace';
import { StatusBar } from '../status-bar/status-bar';
import { ManualTicker, ManualWallClock, uiParts } from '../ui-parts.testing';
import { WatchedRunStore } from '../watched-run-store';
import { toBuiltInScenarioId } from '../../../application-core/scenarios/built-in-scenarios';

const ONE_ORDER_BUILT_IN = toBuiltInScenarioId('one-order');

describe('the run workspace', () => {
    let wall: ManualWallClock;
    let ticker: ManualTicker;
    let store: WatchedRunStore;
    let fixture: ComponentFixture<RunWorkspace>;
    let bar: ComponentFixture<StatusBar>;

    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const shown = (id: string): string | undefined =>
        element().querySelector(`[data-testid="${id}"]`)?.textContent.trim();
    const inBar = (id: string): string | undefined =>
        (bar.nativeElement as HTMLElement)
            .querySelector(`[data-testid="${id}"]`)
            ?.textContent.trim();
    const button = (name: string): HTMLButtonElement =>
        [...element().querySelectorAll('button')].find(
            (candidate) => candidate.textContent.trim() === name,
        )!;

    async function settled(): Promise<void> {
        await fixture.whenStable();
        bar.detectChanges();
    }

    /** Clicks a button, and lets the screen catch up. */
    async function click(name: string): Promise<void> {
        button(name).click();
        await settled();
    }

    async function press(key: string): Promise<void> {
        const keyboardEvent = new KeyboardEvent('keydown', { key, bubbles: true });
        document.body.dispatchEvent(keyboardEvent);
        await settled();
    }

    async function runToTheEnd(): Promise<void> {
        await click('max');
        await click('Start');
        while (ticker.isGoing) {
            wall.time += 16;
            ticker.fire();
        }
        await settled();
    }

    beforeEach(async () => {
        wall = new ManualWallClock();
        ticker = new ManualTicker();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), ...uiParts(wall, ticker)],
        });
        store = TestBed.inject(WatchedRunStore);
        store.openBuiltIn(ONE_ORDER_BUILT_IN);
        fixture = TestBed.createComponent(RunWorkspace);
        bar = TestBed.createComponent(StatusBar);
        await settled();
    });

    it('shows the scenario, paused at time 0', () => {
        const scenarioName = shown('scenario-name');
        expect(scenarioName).toBe('One order, happy path');
        const statusState = inBar('status-state');
        expect(statusState).toBe('Ready');
        const statusTime = inBar('status-time');
        expect(statusTime).toBe('h00:m00:s00:ms00');
    });

    it('shows the version, seed, and speed in the status bar', () => {
        const statusVersion = inBar('status-version');
        expect(statusVersion).toBe('V1.0.0');
        const statusSeed = inBar('status-seed');
        expect(statusSeed).toBe('42');
        const statusSpeed = inBar('status-speed');
        expect(statusSpeed).toBe('60x');
    });

    it('starts the run, and shows time moving', async () => {
        await click('Start');

        wall.time = 100;
        ticker.fire();
        await settled();

        const statusState = inBar('status-state');
        expect(statusState).toBe('Running');
        const statusTime = inBar('status-time');
        expect(statusTime).toBe('h00:m00:s06:ms00');
    });

    it('offers Pause while running, and pauses', async () => {
        await click('Start');

        await click('Pause');

        const statusState = inBar('status-state');
        expect(statusState).toBe('Paused');
    });

    it('steps', async () => {
        await click('Step');

        const statusState = inBar('status-state');
        expect(statusState).toBe('Paused');
    });

    it('changes speed with a preset, and marks the one chosen', async () => {
        await click('600x');

        const statusSpeed = inBar('status-speed');
        expect(statusSpeed).toBe('600x');
        expect(button('600x').classList).toContain('is-selected');
        expect(button('60x').classList).not.toContain('is-selected');
    });

    it('takes a typed speed', async () => {
        element().querySelector<HTMLInputElement>('[data-testid="typed-speed"]')!.value = '250';

        await click('Set');

        const statusSpeed = inBar('status-speed');
        expect(statusSpeed).toBe('250x');
    });

    it('takes a typed speed on Enter', async () => {
        const input = element().querySelector<HTMLInputElement>('[data-testid="typed-speed"]')!;
        input.value = '250';

        const keyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        input.dispatchEvent(keyboardEvent);
        await settled();

        const statusSpeed = inBar('status-speed');
        expect(statusSpeed).toBe('250x');
    });

    it('says when a typed speed is not one, and keeps the speed', async () => {
        element().querySelector<HTMLInputElement>('[data-testid="typed-speed"]')!.value = 'fast';

        await click('Set');

        const speedInvalid = shown('speed-invalid');
        expect(speedInvalid).toContain('A speed is a number');
        const statusSpeed = inBar('status-speed');
        expect(statusSpeed).toBe('60x');
    });

    it('marks a typed speed in use, and a preset clears it', async () => {
        const input = element().querySelector<HTMLInputElement>('[data-testid="typed-speed"]')!;
        input.value = '250';

        await click('Set');
        expect(input.classList).toContain('is-current');

        await click('600x');
        expect(input.classList).not.toContain('is-current');
        expect(input.value).toBe('');
    });

    it('marks a wrong speed, until it is edited or a preset replaces it', async () => {
        const input = element().querySelector<HTMLInputElement>('[data-testid="typed-speed"]')!;
        input.value = 'fast';

        await click('Set');
        const attribute = input.getAttribute('aria-invalid');
        expect(attribute).toBe('true');

        input.value = 'faster';
        const event = new Event('input');
        input.dispatchEvent(event);
        await settled();
        const ariaInvalid = input.getAttribute('aria-invalid');
        expect(ariaInvalid).toBe('false');
        const speedInvalid = shown('speed-invalid');
        expect(speedInvalid).toBeUndefined();

        await click('Set');
        await click('600x');
        const secondSpeedInvalid = shown('speed-invalid');
        expect(secondSpeedInvalid).toBeUndefined();
        expect(input.value).toBe('');
    });

    it('gives the Start button the state of the run', async () => {
        const start = (): HTMLElement =>
            element().querySelector<HTMLElement>('[data-testid="start"]')!;
        expect(start().dataset['state']).toBe('Ready');

        await click('Start');
        expect(start().dataset['state']).toBe('Running');

        await click('Pause');
        expect(start().dataset['state']).toBe('Paused');
    });

    it('shows the verdict at the end, with each criterion and the digest', async () => {
        await runToTheEnd();

        const runVerdict = shown('run-verdict');
        expect(runVerdict).toBe('Passed');
        const statusVerdict = inBar('status-verdict');
        expect(statusVerdict).toBe('Passed');
        const runCriteria = shown('run-criteria');
        expect(runCriteria).toContain('Modules agree: passed');
        const runDigest = shown('run-digest');
        expect(runDigest).toBe(ONE_ORDER_DIGEST);
    });

    it('shows the orders finished at the end', async () => {
        await runToTheEnd();

        const statusOrders = inBar('status-orders');
        expect(statusOrders).toBe('1 of 1');
    });

    it('cannot start or step once it has ended', async () => {
        await runToTheEnd();

        expect(button('Start').disabled).toBe(true);
        expect(button('Step').disabled).toBe(true);
    });

    it('keeps going past the end when asked, and keeps the verdict', async () => {
        await runToTheEnd();

        await click('Keep going');
        await click('Resume');
        wall.time += 16;
        ticker.fire();
        await settled();

        const statusState = inBar('status-state');
        expect(statusState).toBe('Running');
        const runVerdict = shown('run-verdict');
        expect(runVerdict).toBe('Passed');
    });

    it('starts afresh when asked to run again', async () => {
        await runToTheEnd();

        await click('Run again');

        const statusState = inBar('status-state');
        expect(statusState).toBe('Ready');
        const statusTime = inBar('status-time');
        expect(statusTime).toBe('h00:m00:s00:ms00');
    });

    it('pauses when left, and resumes on the way back', async () => {
        await click('Start');

        fixture.destroy();
        const whileAway = store.view()?.state;
        fixture = TestBed.createComponent(RunWorkspace);
        await settled();

        expect(whileAway).toBe('Paused');
        const statusState = inBar('status-state');
        expect(statusState).toBe('Running');
    });

    describe('from the keyboard', () => {
        it('starts and pauses with Space', async () => {
            await press(' ');
            const started = inBar('status-state');

            await press(' ');

            expect(started).toBe('Running');
            const statusState = inBar('status-state');
            expect(statusState).toBe('Paused');
        });

        it('steps with S', async () => {
            await press('s');

            const statusState = inBar('status-state');
            expect(statusState).toBe('Paused');
        });

        it('chooses a speed with a number', async () => {
            await press('4');

            const statusSpeed = inBar('status-speed');
            expect(statusSpeed).toBe('600x');
        });

        it('leaves other keys alone', async () => {
            await press('x');

            const statusState = inBar('status-state');
            expect(statusState).toBe('Ready');
        });

        it('leaves keys alone in a text box', async () => {
            const input = element().querySelector<HTMLInputElement>(
                '[data-testid="typed-speed"]',
            )!;

            const keyboardEvent = new KeyboardEvent('keydown', { key: 's', bubbles: true });
            input.dispatchEvent(keyboardEvent);
            await settled();

            const statusState = inBar('status-state');
            expect(statusState).toBe('Ready');
        });
    });

    describe('the detail panel', () => {
        const entry = (): number => store.entries().size - 1;

        it('invites selecting an event until one is', () => {
            expect(element().querySelector('[data-testid="detail-panel"]')?.textContent).toContain(
                'Select an event',
            );
        });

        it('opens the verdict when the run ends', async () => {
            await runToTheEnd();

            const runVerdict = shown('run-verdict');
            expect(runVerdict).toBe('Passed');
        });

        it('opens the event when one is selected', async () => {
            await runToTheEnd();

            const sequence = entry();
            store.select(sequence);
            await settled();

            const payloadKind = shown('payload-kind');
            expect(payloadKind).toContain(`#${entry()}`);
            const runVerdict = shown('run-verdict');
            expect(runVerdict).toBeUndefined();
        });

        it('goes back to the verdict from its tab', async () => {
            await runToTheEnd();
            const sequence = entry();
            store.select(sequence);
            await settled();

            await click('Verdict');

            const runVerdict = shown('run-verdict');
            expect(runVerdict).toBe('Passed');
        });

        it('stays on the selected event when the run goes on past the end', async () => {
            await runToTheEnd();
            await click('Keep going');
            const sequence = entry();
            store.select(sequence);
            await settled();

            await click('Resume');
            wall.time += 16;
            ticker.fire();
            await settled();

            const runVerdict = shown('run-verdict');
            expect(runVerdict).toBeUndefined();
        });

        it('clears the selection on running again', async () => {
            await runToTheEnd();
            const sequence = entry();
            store.select(sequence);
            await click('Verdict');

            await click('Run again');

            const selectedEntry = store.selectedEntry();
            expect(selectedEntry).toBeNull();
        });

        it('says when the verdict has yet to come', async () => {
            await click('Verdict');

            expect(element().querySelector('[data-testid="detail-panel"]')?.textContent).toContain(
                'The verdict shows here when the run ends',
            );
        });
    });

    describe('resizing', () => {
        const widthOf = (): string =>
            element()
                .querySelector<HTMLElement>('.workspace')!
                .style.getPropertyValue('--detail-width');
        const heightOf = (): string =>
            element()
                .querySelector<HTMLElement>('.workspace')!
                .style.getPropertyValue('--timeline-height');

        async function pressOn(id: string, key: string): Promise<void> {
            const keyboardEvent = new KeyboardEvent('keydown', { key });
            element().querySelector(`[data-testid="${id}"]`)!.dispatchEvent(keyboardEvent);
            await settled();
        }

        it('widens the detail panel with the left arrow', async () => {
            await pressOn('detail-divider', 'ArrowLeft');

            const width = widthOf();
            expect(width).toBe('336px');
        });

        it('narrows the detail panel with the right arrow', async () => {
            await pressOn('detail-divider', 'ArrowRight');

            const width = widthOf();
            expect(width).toBe('304px');
        });

        it('heightens the timeline with the up arrow', async () => {
            await pressOn('timeline-divider', 'ArrowUp');

            const height = heightOf();
            expect(height).toBe('216px');
        });

        it('lowers the timeline with the down arrow', async () => {
            await pressOn('timeline-divider', 'ArrowDown');

            const height = heightOf();
            expect(height).toBe('184px');
        });
    });
});

describe('the run workspace with no run open', () => {
    it('says so, and points to where to start one', async () => {
        const wall = new ManualWallClock();
        const ticker = new ManualTicker();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), ...uiParts(wall, ticker)],
        });
        const fixture = TestBed.createComponent(RunWorkspace);

        await fixture.whenStable();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('No run is open');
    });
});
