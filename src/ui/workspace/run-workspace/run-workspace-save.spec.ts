import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { RunLevel } from '../../../application-core/run-history/saved-run';
import {
    MemoryRunRepository,
    STORAGE_FULL_MESSAGE,
} from '../../../application-core/run-history/run-stores.testing';
import { toBuiltInScenarioId } from '../../../application-core/scenarios/built-in-scenarios';
import { ManualTicker, ManualWallClock, uiParts } from '../ui-parts.testing';
import { WatchedRunStore } from '../watched-run-store';
import { RunWorkspace } from './run-workspace';

const ONE_ORDER_BUILT_IN = toBuiltInScenarioId('one-order');

describe('saving from the run workspace', () => {
    let runs: MemoryRunRepository;
    let fixture: ComponentFixture<RunWorkspace>;

    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const byTestId = (id: string): HTMLElement | null =>
        element().querySelector<HTMLElement>(`[data-testid="${id}"]`);

    /** Clicks what a test ID names, and lets the screen and any save catch up. */
    async function click(id: string): Promise<void> {
        byTestId(id)?.click();
        await fixture.whenStable();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        runs = new MemoryRunRepository();
        const wall = new ManualWallClock();
        const ticker = new ManualTicker();
        const parts = uiParts(wall, ticker, runs);
        TestBed.configureTestingModule({ providers: [provideRouter([]), ...parts] });
        TestBed.inject(WatchedRunStore).openBuiltIn(ONE_ORDER_BUILT_IN);
        fixture = TestBed.createComponent(RunWorkspace);
        await fixture.whenStable();
    });

    it('opens the form with the name offered, saves the run, and says so', async () => {
        await click('save-open');
        const name = byTestId('save-name');
        const offered = name instanceof HTMLInputElement ? name.value : '';

        await click('save-run');

        const [saved] = await runs.list();
        expect(offered).toMatch(
            /^One order, happy path, [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$/,
        );
        expect(saved).toMatchObject({ name: offered, level: RunLevel.Everything });
        const form = byTestId('save-form');
        expect(form).toBeNull();
        expect(byTestId('saved-as')?.textContent).toContain(offered);
    });

    it('keeps the form open when the run does not fit, and saves at minimum when asked', async () => {
        runs.isFull = true;
        await click('save-open');
        await click('save-run');
        const problem = byTestId('save-problem')?.textContent;
        runs.isFull = false;

        await click('save-minimum');

        const [saved] = await runs.list();
        expect(problem).toContain(STORAGE_FULL_MESSAGE);
        expect(saved?.level).toBe(RunLevel.Minimum);
    });

    it('closes the indirect effect form when the save form opens, and the other way round', async () => {
        await click('state-indirect');
        await click('save-open');
        const isIndirectOpen = byTestId('indirect-form') !== null;

        await click('state-indirect');

        const form = byTestId('save-form');
        expect(isIndirectOpen).toBe(false);
        expect(form).toBeNull();
    });
});
