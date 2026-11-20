import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { FunctionName } from '../../../application-core/simulation-engine/function-name';
import { toVersionNumber } from '../../../domain/system/records/version-chain';
import type { IFunctionChoice, IModuleRulesView } from '../rules-view';
import { RulesPanel } from './rules-panel';

const ONE = toVersionNumber(1);
const TWO = toVersionNumber(2);

/** Orders with one function, pick up, at version 1 of two, and no rules. */
const ORDERS: IModuleRulesView = {
    name: 'Orders',
    rules: [],
    functions: [
        { name: FunctionName.OrdersPickUp, label: 'Pick up', inUse: ONE, versions: [ONE, TWO] },
    ],
};

async function panel(labels: readonly string[] = []): Promise<{
    fixture: ComponentFixture<RulesPanel>;
    host: HTMLElement;
    used: IFunctionChoice[];
}> {
    const fixture = TestBed.createComponent(RulesPanel);
    fixture.componentRef.setInput('modules', [ORDERS]);
    fixture.componentRef.setInput('labels', labels);
    await fixture.whenStable();
    const used: IFunctionChoice[] = [];
    fixture.componentInstance.use.subscribe((choice) => used.push(choice));
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, used };
}

function byTestId<T extends HTMLElement>(host: HTMLElement, id: string, type: new () => T): T {
    const found = host.querySelector(`[data-testid="${id}"]`);
    if (!(found instanceof type)) {
        throw new Error(`Nothing of the right type has the test ID ${id}.`);
    }
    return found;
}

describe("the Rules panel's functions", () => {
    it('shows each function with the version in use, and every version to choose from', async () => {
        const { host } = await panel();

        const inUse = byTestId(host, 'function-version', HTMLTableCellElement).textContent.trim();
        const options = [...byTestId(host, 'function-versions', HTMLSelectElement).options];
        const versions = options.map((option) => option.value);
        expect(inUse).toBe('1');
        expect(versions).toEqual(['1', '2']);
    });

    it('switches to the version chosen, and does nothing for the one in use', async () => {
        const { host, used } = await panel();
        const select = byTestId(host, 'function-versions', HTMLSelectElement);
        const use = byTestId(host, 'function-use', HTMLButtonElement);

        use.click();
        select.value = '2';
        use.click();

        expect(used).toEqual([{ function: FunctionName.OrdersPickUp, version: TWO }]);
    });

    it('follows from the indirect effect chosen for changes', async () => {
        const { fixture, host, used } = await panel(['ignored']);
        const follows = byTestId(host, 'rules-follows-from', HTMLSelectElement);
        follows.value = 'ignored';
        const changed = new Event('change');
        follows.dispatchEvent(changed);
        await fixture.whenStable();
        byTestId(host, 'function-versions', HTMLSelectElement).value = '2';

        byTestId(host, 'function-use', HTMLButtonElement).click();

        expect(used).toEqual([
            { function: FunctionName.OrdersPickUp, version: TWO, after: 'ignored' },
        ]);
    });
});
