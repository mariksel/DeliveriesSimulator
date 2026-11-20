import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { Position } from '../../../domain/system/math/math';
import { toPosition } from '../../../domain/system/math/math';
import type { IRecordVersionsView } from '../record-versions-view';
import { RecordVersions } from './record-versions';

const VIEWS: readonly IRecordVersionsView[] = [
    {
        id: 'Order:order-1',
        title: 'Order order-1, in Orders',
        rows: [
            {
                id: 'Order:1',
                number: 1,
                summary: 'Created',
                madeBy: 'Job run or API call 5',
                place: toPosition(5),
                commitText: 'Commit #5',
                tooltip: 'Show commit #5, which made version 1',
            },
            {
                id: 'Order:2',
                number: 2,
                summary: 'Created',
                madeBy: "The run's start",
                place: null,
                commitText: '—',
                tooltip: 'Made at the start of the run, before any commit',
            },
        ],
    },
    { id: 'Delivery:order-1', title: 'Its delivery, in Deliveries', rows: [] },
];

async function shown(): Promise<{ component: RecordVersions; host: HTMLElement }> {
    const fixture = TestBed.createComponent(RecordVersions);
    fixture.componentRef.setInput('title', 'Order order-1');
    fixture.componentRef.setInput('views', VIEWS);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    return { component: fixture.componentInstance, host };
}

const byTestId = (host: HTMLElement, id: string): HTMLElement[] => [
    ...host.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`),
];

describe("the selected order's versions", () => {
    it('lists each record, and says when one has no versions yet', async () => {
        const { host } = await shown();

        const records = byTestId(host, 'record-versions');
        const versions = byTestId(host, 'record-version');

        expect(records).toHaveLength(2);
        expect(versions).toHaveLength(2);
        expect(records[1]?.textContent).toContain('No versions yet at the commit shown.');
    });

    it('shows the commit that made a version, and clears the selection', async () => {
        const { component, host } = await shown();
        const places: Position[] = [];
        let cleared = 0;
        component.choosePlace.subscribe((place) => places.push(place));
        component.clear.subscribe(() => {
            cleared += 1;
        });

        byTestId(host, 'record-version-commit')[0]?.click();
        byTestId(host, 'clear-selected-subject')[0]?.click();

        expect(places).toEqual([5]);
        expect(cleared).toBe(1);
    });
});
