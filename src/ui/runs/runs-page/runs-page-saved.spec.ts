import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RunLevel } from '../../../application-core/run-history/saved-run';
import { MemoryRunRepository } from '../../../application-core/run-history/run-stores.testing';
import { toBuiltInScenarioId } from '../../../application-core/scenarios/built-in-scenarios';
import { ManualTicker, ManualWallClock, uiParts } from '../../workspace/ui-parts.testing';
import { WatchedRunStore } from '../../workspace/watched-run-store';
import { RunsPage } from './runs-page';
import type { IRunState } from '../../../application-core/simulation-engine/run-state';

const ONE_ORDER_BUILT_IN = toBuiltInScenarioId('one-order');
const STEPS = 3;
/** Enough steps for a run with several state commits. */
const LONGER = 20;

describe('the saved runs on the runs page', () => {
    let runs: MemoryRunRepository;
    let store: WatchedRunStore;
    let fixture: ComponentFixture<RunsPage>;
    let navigate: ReturnType<typeof vi.fn>;

    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const byTestId = (id: string): HTMLElement | null =>
        element().querySelector<HTMLElement>(`[data-testid="${id}"]`);
    const textOf = (id: string): string => byTestId(id)?.textContent.trim() ?? '';

    async function settled(): Promise<void> {
        await fixture.whenStable();
        await fixture.whenStable();
    }

    async function click(id: string): Promise<void> {
        byTestId(id)?.click();
        await settled();
    }

    /** Opens the one-order scenario, steps it a few times, and saves it. */
    async function savedRun(): Promise<void> {
        store.openBuiltIn(ONE_ORDER_BUILT_IN);
        Array.from({ length: STEPS }).forEach(() => {
            store.step();
        });
        await store.save('My run', RunLevel.Everything);
    }

    async function showPage(): Promise<void> {
        fixture = TestBed.createComponent(RunsPage);
        await settled();
    }

    beforeEach(() => {
        runs = new MemoryRunRepository();
        const wall = new ManualWallClock();
        const ticker = new ManualTicker();
        const parts = uiParts(wall, ticker, runs);
        TestBed.configureTestingModule({ providers: [provideRouter([]), ...parts] });
        store = TestBed.inject(WatchedRunStore);
        navigate = vi.fn(() => Promise.resolve(true));
        const router = TestBed.inject(Router);
        vi.spyOn(router, 'navigateByUrl').mockImplementation(navigate as never);
    });

    it('says when there are none', async () => {
        await showPage();

        const empty = textOf('no-saved-runs');
        expect(empty).toContain('No saved runs yet');
    });

    it('lists each saved run with its name, level, and size', async () => {
        await savedRun();

        await showPage();

        const details = textOf('saved-run-details');
        const name = textOf('saved-run-name');
        expect(name).toBe('My run');
        expect(details).toMatch(/^Everything · \d+ KB · \d+ commits · 1 branch · saved /);
    });

    it('opens a saved run in the workspace, paused at its latest commit', async () => {
        await savedRun();
        await showPage();

        await click('saved-run-open');

        const state = store.view()?.state;
        expect(navigate).toHaveBeenCalledWith('/runs/live');
        expect(state).toBe('Paused');
    });

    it('asks first before opening over a run with changes not saved', async () => {
        await savedRun();
        store.step();
        await showPage();

        await click('saved-run-open');
        const question = textOf('saved-run-confirm');
        const wasNavigated = navigate.mock.calls.length > 0;
        await click('saved-run-confirm-yes');

        expect(question).toContain('not saved');
        expect(wasNavigated).toBe(false);
        expect(navigate).toHaveBeenCalledWith('/runs/live');
    });

    it('moves a saved run to the other level once confirmed', async () => {
        await savedRun();
        await showPage();

        await click('saved-run-move');
        const question = textOf('saved-run-confirm');
        await click('saved-run-confirm-yes');

        const [saved] = await runs.list();
        expect(question).toContain('Keep only the minimum');
        const move = textOf('saved-run-move');
        expect(saved?.level).toBe(RunLevel.Minimum);
        expect(move).toBe('Move to everything');
    });

    it('deletes a saved run only once confirmed', async () => {
        await savedRun();
        await showPage();
        await click('saved-run-delete');
        await click('saved-run-confirm-no');
        const isKept = byTestId('saved-run') !== null;

        await click('saved-run-delete');
        const question = textOf('saved-run-confirm');
        await click('saved-run-confirm-yes');

        const listed = await runs.list();
        expect(isKept).toBe(true);
        expect(question).toContain('Delete “My run”?');
        const empty = textOf('no-saved-runs');
        expect(listed).toEqual([]);
        expect(empty).toContain('No saved runs yet');
    });

    it('runs both snapshot tests of a saved run, and says every commit matches', async () => {
        await savedRun();
        await showPage();

        await click('saved-run-snapshot');

        const result = textOf('saved-run-snapshot-result');
        expect(result).toContain('With its own versions: all');
        expect(result).toContain('With the newest versions: all');
    });

    it('names the first commit that differs, and opening the run shows it', async () => {
        store.openBuiltIn(ONE_ORDER_BUILT_IN);
        Array.from({ length: LONGER }).forEach(() => {
            store.step();
        });
        await store.save('Longer', RunLevel.Everything);
        const [saved] = await runs.list();
        const run = await runs.load(saved!.id);
        const commits = run!.line.commits;
        const second = commits
            .valueSeq()
            .filter((commit) => commit.call !== null)
            .get(1)!;
        const first = commits.valueSeq().find((commit) => commit.call !== null)!;
        const tampered = commits.set(second.id, { ...second, root: first.root });
        const changed = { ...run!, line: { ...run!.line, commits: tampered } };
        runs.load = (): Promise<IRunState> => Promise.resolve(changed);
        await showPage();

        await click('saved-run-snapshot');
        await click('saved-run-open');

        const place = commits.keySeq().indexOf(second.id) + 1;
        const result = textOf('saved-run-snapshot-result');
        expect(result).toContain(`commit ${place} is the first to differ`);
        expect(store.view()?.place).toBe(place);
    });
});
