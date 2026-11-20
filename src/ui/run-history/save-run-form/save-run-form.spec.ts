import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { RunLevel } from '../../../application-core/run-history/saved-run';
import type { ISaveChoice } from './save-run-form';
import { SaveRunForm } from './save-run-form';

const OFFERED = 'One order, 2026-11-09 21:40';

async function form(problem: string | null = null): Promise<{
    fixture: ComponentFixture<SaveRunForm>;
    host: HTMLElement;
    saved: ISaveChoice[];
    closed: () => number;
}> {
    const fixture = TestBed.createComponent(SaveRunForm);
    fixture.componentRef.setInput('defaultName', OFFERED);
    fixture.componentRef.setInput('problem', problem);
    await fixture.whenStable();
    const saved: ISaveChoice[] = [];
    let closings = 0;
    fixture.componentInstance.saved.subscribe((choice) => saved.push(choice));
    fixture.componentInstance.closed.subscribe(() => {
        closings += 1;
    });
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, saved, closed: () => closings };
}

function byTestId<T extends HTMLElement>(host: HTMLElement, id: string, type: new () => T): T {
    const found = host.querySelector(`[data-testid="${id}"]`);
    if (!(found instanceof type)) {
        throw new Error(`Nothing of the right type has the test ID ${id}.`);
    }
    return found;
}

describe('the form to save a run', () => {
    it('offers the name given, and saves at everything unless told otherwise', async () => {
        const { host, saved } = await form();
        const name = byTestId(host, 'save-name', HTMLInputElement);

        byTestId(host, 'save-run', HTMLButtonElement).click();

        expect(name.value).toBe(OFFERED);
        expect(saved).toEqual([{ name: OFFERED, level: RunLevel.Everything }]);
    });

    it('saves under a name typed, at the level chosen', async () => {
        const { fixture, host, saved } = await form();
        byTestId(host, 'save-name', HTMLInputElement).value = '  my run  ';
        const level = byTestId(host, 'save-level', HTMLSelectElement);
        level.value = RunLevel.Minimum;
        const changed = new Event('change');
        level.dispatchEvent(changed);
        await fixture.whenStable();

        byTestId(host, 'save-run', HTMLButtonElement).click();

        expect(saved).toEqual([{ name: 'my run', level: RunLevel.Minimum }]);
    });

    it('asks for a name, saving nothing without one', async () => {
        const { fixture, host, saved } = await form();
        byTestId(host, 'save-name', HTMLInputElement).value = ' ';

        byTestId(host, 'save-run', HTMLButtonElement).click();
        await fixture.whenStable();

        const problem = byTestId(host, 'save-name-problem', HTMLSpanElement);
        expect(problem.textContent).toContain('needs a name');
        expect(saved).toEqual([]);
    });

    it('says why a save stored nothing, and offers "minimum"', async () => {
        const { host, saved } = await form('Browser storage has no room for this run.');
        const problem = byTestId(host, 'save-problem', HTMLSpanElement);

        byTestId(host, 'save-minimum', HTMLButtonElement).click();

        expect(problem.textContent).toContain('no room');
        expect(saved).toEqual([{ name: OFFERED, level: RunLevel.Minimum }]);
    });

    it('waits while a save is under way, and closes when cancelled', async () => {
        const { fixture, host, closed } = await form();
        byTestId(host, 'save-cancel', HTMLButtonElement).click();
        fixture.componentRef.setInput('isSaving', true);
        await fixture.whenStable();

        const save = byTestId(host, 'save-run', HTMLButtonElement);
        const closings = closed();
        expect(closings).toBe(1);
        expect(save.disabled).toBe(true);
        expect(save.textContent).toContain('Saving');
    });
});
