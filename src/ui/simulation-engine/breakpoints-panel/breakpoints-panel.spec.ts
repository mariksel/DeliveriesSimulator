import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { IBreakpoint } from '../../../application-core/simulation-engine/breakpoints';
import type { RunLogEntry } from '../../../application-core/simulation-engine/run-log-entry';
import { oneOrderRun } from '../../../application/simulation-engine/one-order-run.testing';
import type { IBreakpointSwitch, INewBreakpoint } from './breakpoints-panel';
import { BreakpointsPanel } from './breakpoints-panel';

const ON_PICK_UP: IBreakpoint = {
    id: 1,
    kind: 'OrderPickedUp',
    source: null,
    order: null,
    isOn: true,
};
const NARROWED: IBreakpoint = {
    id: 2,
    kind: 'InboxEventRead',
    source: 'orders',
    order: 'order-1',
    isOn: false,
};

async function panel(breakpoints: readonly IBreakpoint[]): Promise<{
    fixture: ComponentFixture<BreakpointsPanel>;
    host: HTMLElement;
}> {
    const fixture = TestBed.createComponent(BreakpointsPanel);
    fixture.componentRef.setInput('breakpoints', breakpoints);
    fixture.componentRef.setInput('kinds', ['InboxEventRead', 'OrderPickedUp']);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host };
}

function byTestId(host: HTMLElement, id: string): HTMLElement {
    const found = host.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (found === null) {
        throw new Error(`Nothing has the test ID ${id}.`);
    }
    return found;
}

function inputOf(host: HTMLElement, id: string): HTMLInputElement {
    const found = byTestId(host, id);
    if (!(found instanceof HTMLInputElement)) {
        throw new Error(`${id} is not an input.`);
    }
    return found;
}

function selectOf(host: HTMLElement, id: string): HTMLSelectElement {
    const found = byTestId(host, id);
    if (!(found instanceof HTMLSelectElement)) {
        throw new Error(`${id} is not a select.`);
    }
    return found;
}

/** The run's first OrderPickedUp, which a breakpoint on that kind stops at. */
function firstPickUp(): RunLogEntry {
    const entries = oneOrderRun().cache.log.entries;
    const entry = entries.find((candidate) => candidate.kind === 'OrderPickedUp');
    if (entry === undefined) {
        throw new Error('The run picks the order up.');
    }
    return entry;
}

describe('the Breakpoints tab', () => {
    it('says there are none, and how to add one', async () => {
        const { host } = await panel([]);

        const hint = byTestId(host, 'no-breakpoints');

        expect(hint.textContent).toContain('Add one here');
    });

    it('adds a breakpoint from a kind, a source, and an order, trimmed', async () => {
        const { fixture, host } = await panel([]);
        const added: INewBreakpoint[] = [];
        fixture.componentInstance.add.subscribe((breakpoint) => added.push(breakpoint));
        const kind = inputOf(host, 'breakpoint-kind');
        const source = selectOf(host, 'breakpoint-source');
        const order = inputOf(host, 'breakpoint-order');

        kind.value = ' OrderPickedUp ';
        source.value = 'orders';
        order.value = ' order-1 ';
        byTestId(host, 'breakpoint-add').click();
        kind.value = '';
        byTestId(host, 'breakpoint-add').click();

        expect(added).toEqual([{ kind: 'OrderPickedUp', source: 'orders', order: 'order-1' }]);
    });

    it('adds one for any source and any order when those are left blank', async () => {
        const { fixture, host } = await panel([]);
        const added: INewBreakpoint[] = [];
        fixture.componentInstance.add.subscribe((breakpoint) => added.push(breakpoint));
        const kind = inputOf(host, 'breakpoint-kind');

        kind.value = 'CommandRefused';
        byTestId(host, 'breakpoint-add').click();

        expect(added).toEqual([{ kind: 'CommandRefused', source: null, order: null }]);
    });

    it('lists each breakpoint with what it is narrowed to, and switches and removes it', async () => {
        const { fixture, host } = await panel([ON_PICK_UP, NARROWED]);
        const switched: IBreakpointSwitch[] = [];
        const removed: number[] = [];
        fixture.componentInstance.switchTo.subscribe((change) => switched.push(change));
        fixture.componentInstance.remove.subscribe((id) => removed.push(id));
        const rows = [...host.querySelectorAll<HTMLElement>('[data-testid="breakpoint"]')];

        const [first, second] = rows;
        byTestId(first ?? host, 'breakpoint-switch').click();
        byTestId(second ?? host, 'breakpoint-remove').click();

        const texts = rows.map((row) => row.textContent.replace(/\s+/g, ' ').trim());
        expect(texts[0]).toContain('OrderPickedUp');
        expect(texts[0]).toContain('any source, any order');
        expect(texts[1]).toContain('orders, order-1');
        expect(second?.classList.contains('is-off')).toBe(true);
        expect(switched).toEqual([{ id: 1, isOn: false }]);
        expect(removed).toEqual([2]);
    });

    it('says which breakpoint the run stopped at, and at which event', async () => {
        const { fixture, host } = await panel([ON_PICK_UP]);
        const entry = firstPickUp();

        fixture.componentRef.setInput('lastHit', { breakpoint: ON_PICK_UP, entry });
        await fixture.whenStable();

        const hit = byTestId(host, 'breakpoint-hit');
        expect(hit.textContent).toContain(`#${entry.sequence}`);
        expect(hit.textContent).toContain('OrderPickedUp');
    });
});
