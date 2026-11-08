import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    INVALID_FILE,
    NOT_JSON,
    ONE_ORDER_FILE,
} from '../../../application-core/scenarios/scenario-ports.testing';
import { ManualTicker, ManualWallClock, uiParts } from '../../workspace/ui-parts.testing';
import { WatchedRunStore } from '../../workspace/watched-run-store';
import { RunsPage } from './runs-page';

describe('the runs page', () => {
    let fixture: ComponentFixture<RunsPage>;
    let navigate: ReturnType<typeof vi.fn>;
    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const problems = (): string | undefined =>
        element().querySelector('[data-testid="scenario-problems"]')?.textContent;

    function choose(...files: File[]): void {
        const input = element().querySelector('input')!;
        Object.defineProperty(input, 'files', { value: files, configurable: true });
        const event = new Event('change');
        input.dispatchEvent(event);
    }

    beforeEach(async () => {
        const wall = new ManualWallClock();
        const ticker = new ManualTicker();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), ...uiParts(wall, ticker)],
        });
        navigate = vi.fn(() => Promise.resolve(true));
        const inject = TestBed.inject(Router);
        vi.spyOn(inject, 'navigateByUrl').mockImplementation(navigate as never);
        fixture = TestBed.createComponent(RunsPage);
        await fixture.whenStable();
    });

    it('offers each built-in scenario', () => {
        expect(element().querySelector('[data-testid="scenario-card"]')?.textContent).toContain(
            'One order, happy path',
        );
    });

    it('opens a built-in scenario in the workspace', async () => {
        element().querySelector('button')!.click();

        await vi.waitFor(() => {
            expect(navigate).toHaveBeenCalledWith('/runs/live');
        });
        expect(TestBed.inject(WatchedRunStore).view()?.state).toBe('Ready');
    });

    it('opens a chosen file in the workspace', async () => {
        const files = new File([''], ONE_ORDER_FILE);
        choose(files);

        await vi.waitFor(() => {
            expect(navigate).toHaveBeenCalledWith('/runs/live');
        });
    });

    it('stays, and says what is wrong with an invalid file', async () => {
        const files = new File([''], INVALID_FILE);
        choose(files);

        await vi.waitFor(async () => {
            await fixture.whenStable();
            const secondProblems = problems();
            expect(secondProblems).toContain(NOT_JSON);
        });
        expect(navigate).not.toHaveBeenCalled();
    });

    it('clears the problems once a scenario opens', async () => {
        const files = new File([''], INVALID_FILE);
        choose(files);
        await vi.waitFor(async () => {
            await fixture.whenStable();
            const secondProblems = problems();
            expect(secondProblems).toBeDefined();
        });

        element().querySelector('button')!.click();

        await vi.waitFor(async () => {
            await fixture.whenStable();
            const secondProblems = problems();
            expect(secondProblems).toBeUndefined();
        });
    });

    function dragEvent(type: string, files: readonly File[]): Event {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'dataTransfer', { value: { files } });
        return event;
    }

    it('opens a dropped file in the workspace', async () => {
        const event = dragEvent('drop', [new File([''], ONE_ORDER_FILE)]);
        element().querySelector('[data-testid="drop-area"]')!.dispatchEvent(event);

        await vi.waitFor(() => {
            expect(navigate).toHaveBeenCalledWith('/runs/live');
        });
    });

    it('shows when a file is over the drop area, and when it has left', async () => {
        const area = element().querySelector('[data-testid="drop-area"]')!;

        const over = dragEvent('dragover', []);
        area.dispatchEvent(over);
        await fixture.whenStable();
        expect(area.classList).toContain('is-dragging');
        expect(over.defaultPrevented).toBe(true);

        const event = dragEvent('dragleave', []);
        area.dispatchEvent(event);
        await fixture.whenStable();
        expect(area.classList).not.toContain('is-dragging');
    });

    it('does nothing when no file is chosen', async () => {
        choose();

        await fixture.whenStable();

        expect(navigate).not.toHaveBeenCalled();
    });
});
