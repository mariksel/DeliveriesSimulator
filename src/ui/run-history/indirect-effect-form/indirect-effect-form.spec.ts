import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { IndirectStatement } from '../../../application-core/simulation-engine/indirect-effect';
import { IndirectEffectForm } from './indirect-effect-form';

const NAMES = { drivers: ['driver-1'], restaurants: ['restaurant-1'], orders: ['A', 'B'] };

async function form(): Promise<{
    fixture: ComponentFixture<IndirectEffectForm>;
    host: HTMLElement;
    stated: IndirectStatement[];
}> {
    const fixture = TestBed.createComponent(IndirectEffectForm);
    fixture.componentRef.setInput('names', NAMES);
    await fixture.whenStable();
    const stated: IndirectStatement[] = [];
    fixture.componentInstance.stated.subscribe((statement) => stated.push(statement));
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, stated };
}

function byTestId<T extends HTMLElement>(host: HTMLElement, id: string, type: new () => T): T {
    const found = host.querySelector(`[data-testid="${id}"]`);
    if (!(found instanceof type)) {
        throw new Error(`Nothing of the right type has the test ID ${id}.`);
    }
    return found;
}

async function choose(
    fixture: ComponentFixture<IndirectEffectForm>,
    host: HTMLElement,
    id: string,
    value: string,
): Promise<void> {
    const select = byTestId(host, id, HTMLSelectElement);
    select.value = value;
    const changed = new Event('change');
    select.dispatchEvent(changed);
    await fixture.whenStable();
}

describe('the indirect effect form', () => {
    it('states a driver ignoring a request, with the driver and order chosen', async () => {
        const { host, stated } = await form();

        byTestId(host, 'indirect-state', HTMLButtonElement).click();

        expect(stated).toEqual([
            { kind: 'driver-ignores-request', order: 'A', label: null, actor: 'driver-1' },
        ]);
    });

    it('asks how much later only for a late restaurant, and says when that is missing', async () => {
        const { fixture, host, stated } = await form();
        await choose(fixture, host, 'indirect-kind', 'restaurant-runs-late');
        const lateBy = byTestId(host, 'indirect-late-by', HTMLInputElement);
        const isLateShown = lateBy.closest('label')?.hidden === false;

        byTestId(host, 'indirect-state', HTMLButtonElement).click();
        await fixture.whenStable();

        const problem = byTestId(host, 'indirect-problem', HTMLSpanElement);
        expect(isLateShown).toBe(true);
        expect(problem.textContent).toContain('How much later');
        expect(stated).toEqual([]);
    });

    it('hides who decides for a customer, and states it for the order chosen', async () => {
        const { fixture, host, stated } = await form();
        await choose(fixture, host, 'indirect-kind', 'customer-wont-take-order');
        await choose(fixture, host, 'indirect-order', 'B');
        const actor = byTestId(host, 'indirect-actor', HTMLSelectElement);

        byTestId(host, 'indirect-state', HTMLButtonElement).click();

        expect(actor.closest('label')?.hidden).toBe(true);
        expect(stated).toEqual([{ kind: 'customer-wont-take-order', order: 'B', label: null }]);
    });

    it('closes without stating anything on Cancel', async () => {
        const { fixture, host, stated } = await form();
        let closings = 0;
        fixture.componentInstance.closed.subscribe(() => {
            closings += 1;
        });

        byTestId(host, 'indirect-cancel', HTMLButtonElement).click();

        expect(closings).toBe(1);
        expect(stated).toEqual([]);
    });
});
