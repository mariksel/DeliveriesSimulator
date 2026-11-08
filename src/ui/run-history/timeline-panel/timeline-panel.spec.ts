import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { MAIN_BRANCH } from '../../../application-core/simulation-engine/branch-id';
import { branchLinesOf, forkAt } from '../../../application-core/simulation-engine/run-branches';
import { oneOrderRun } from '../../../application/simulation-engine/one-order-run.testing';
import { toPosition } from '../../../domain/system/math/math';
import { RowMode, timelineGrid, timelineRows } from '../timeline-grid';
import type { IColumnHeading, ITimelineRowView } from '../timeline-view';
import { columnHeadings, TimelineZoom, timelineRowViews } from '../timeline-view';
import type { IBranchRename, INodeToggle } from './timeline-panel';
import { TimelinePanel } from './timeline-panel';

const FORK_PLACE = toPosition(40);

/** Main forked at commit 40, drawn closed, as the timeline is given it. */
function forkedRun(): {
    readonly headings: readonly IColumnHeading[];
    readonly rows: readonly ITimelineRowView[];
} {
    const main = oneOrderRun();
    const forked = forkAt(main, FORK_PLACE);
    const lines = branchLinesOf(forked).toArray();
    const grid = timelineGrid(lines, RowMode.ByTime);
    const closed = new Set<string>();
    const rows = timelineRows(grid.nodes, closed);
    const fork = forked.history.current;
    const line = new Map([
        [fork, Number.POSITIVE_INFINITY],
        [MAIN_BRANCH, FORK_PLACE],
    ]);
    const context = {
        currentBranch: fork,
        line,
        place: FORK_PLACE,
        selected: null,
        isOpen: (): boolean => false,
    };
    const views = timelineRowViews(rows, grid.columns, context);
    const headings = columnHeadings(grid.columns);
    return { headings, rows: views };
}

const DRAWN = forkedRun();

async function panel(mode: RowMode = RowMode.ByTime): Promise<{
    fixture: ComponentFixture<TimelinePanel>;
    host: HTMLElement;
}> {
    const fixture = TestBed.createComponent(TimelinePanel);
    fixture.componentRef.setInput('headings', DRAWN.headings);
    fixture.componentRef.setInput('rows', DRAWN.rows);
    fixture.componentRef.setInput('rowMode', mode);
    fixture.componentRef.setInput('zoom', TimelineZoom.Middle);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host };
}

function all(host: HTMLElement, id: string): HTMLElement[] {
    return [...host.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)];
}

function byTestId(host: HTMLElement, id: string): HTMLElement {
    const [found] = all(host, id);
    if (found === undefined) {
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

describe('the timeline panel', () => {
    it('names its zoom levels for the way rows line up, and asks for the one chosen', async () => {
        const byTime = await panel(RowMode.ByTime);
        const byNumber = await panel(RowMode.ByNumber);
        const zooms: TimelineZoom[] = [];
        const modes: RowMode[] = [];
        byTime.fixture.componentInstance.zoomTo.subscribe((zoom) => zooms.push(zoom));
        byTime.fixture.componentInstance.mode.subscribe((mode) => modes.push(mode));

        byTestId(byTime.host, 'zoom-Top').click();
        byTestId(byTime.host, 'rows-by-number').click();

        const timeLabel = byTestId(byTime.host, 'zoom-Top').textContent.trim();
        const numberLabel = byTestId(byNumber.host, 'zoom-Top').textContent.trim();
        expect(timeLabel).toBe('Hours');
        expect(numberLabel).toBe('Hundreds');
        expect(zooms).toEqual([TimelineZoom.Top]);
        expect(modes).toEqual([RowMode.ByNumber]);
    });

    it('heads a column for each branch, and watches another branch from its heading', async () => {
        const { fixture, host } = await panel();
        const watched: string[] = [];
        fixture.componentInstance.watch.subscribe((id) => watched.push(id));
        const names = all(host, 'watch-branch');

        names.forEach((name) => {
            name.click();
        });

        const headings = all(host, 'branch-heading');
        expect(headings).toHaveLength(2);
        expect(watched).toEqual([MAIN_BRANCH]);
    });

    it('renames a branch from its heading, and keeps the name on Cancel', async () => {
        const { fixture, host } = await panel();
        const renamed: IBranchRename[] = [];
        fixture.componentInstance.rename.subscribe((rename) => renamed.push(rename));
        const [, forkHeading] = all(host, 'branch-heading');

        byTestId(forkHeading ?? host, 'branch-rename').click();
        await fixture.whenStable();
        const input = inputOf(host, 'branch-rename-input');
        input.value = 'Faster passes';
        byTestId(host, 'branch-save-name').click();
        await fixture.whenStable();

        expect(renamed).toEqual([{ id: 'fork-1', name: 'Faster passes' }]);
        const boxes = all(host, 'branch-rename-input');
        expect(boxes).toHaveLength(0);
    });

    it('opens or closes a group from its summary node', async () => {
        const { fixture, host } = await panel();
        const toggled: INodeToggle[] = [];
        fixture.componentInstance.openOrClose.subscribe((toggle) => toggled.push(toggle));
        const summaries = all(host, 'summary-node');

        summaries[0]?.click();

        expect(summaries.length).toBeGreaterThan(0);
        expect(toggled).toHaveLength(1);
        expect(toggled[0]?.isOpen).toBe(false);
    });
});
