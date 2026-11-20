import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { MAIN_BRANCH } from '../../../application-core/simulation-engine/branch-id';
import { branchLinesOf, forkAt } from '../../../application-core/simulation-engine/run-branches';
import { oneOrderRun } from '../../../application/simulation-engine/one-order-run.testing';
import { toPosition } from '../../../domain/system/math/math';
import { TimelineView, timelineGrid, timelineRows } from '../timeline-grid';
import type { IColumnHeading, ITimelineRowView } from '../timeline-view';
import { columnHeadings, TimelineZoom, timelineRowViews } from '../timeline-view';
import { CommitKind } from '../../../application-core/simulation-engine/commit';
import { GapDisplay, gapsBefore } from '../timeline-gaps';
import type { ISubjectChoice } from '../../workspace/watched-run-store';
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
    const grid = timelineGrid(lines, TimelineView.ByTime);
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

/** The one-order run by time with every commit shown, and a row for every gap. */
function gapsDrawn(): readonly ITimelineRowView[] {
    const run = oneOrderRun();
    const lines = branchLinesOf(run).toArray();
    const grid = timelineGrid(lines, TimelineView.ByTime);
    const isOpen = (): boolean => true;
    const rows = timelineRows(grid.nodes, isOpen);
    const gaps = gapsBefore(rows, isOpen, 1);
    const context = {
        currentBranch: MAIN_BRANCH,
        line: new Map([[MAIN_BRANCH, Number.POSITIVE_INFINITY]]),
        place: FORK_PLACE,
        selected: null,
        isOpen,
        gaps,
    };
    return timelineRowViews(rows, grid.columns, context);
}

/** The one-order run by order, closed, with its order highlighted or not. */
function ordersDrawn(isHighlighted: boolean): readonly ITimelineRowView[] {
    const run = oneOrderRun();
    const lines = branchLinesOf(run).toArray();
    const grid = timelineGrid(lines, TimelineView.ByOrder);
    const closed = new Set<string>();
    const rows = timelineRows(grid.nodes, closed);
    const [order] = grid.nodes;
    const highlight = isHighlighted ? { key: order!.key, commits: order!.commits } : null;
    const context = {
        currentBranch: MAIN_BRANCH,
        line: new Map([[MAIN_BRANCH, Number.POSITIVE_INFINITY]]),
        place: FORK_PLACE,
        selected: null,
        isOpen: (): boolean => false,
        highlight,
    };
    return timelineRowViews(rows, grid.columns, context);
}

async function panel(mode: TimelineView = TimelineView.ByTime): Promise<{
    fixture: ComponentFixture<TimelinePanel>;
    host: HTMLElement;
}> {
    const fixture = TestBed.createComponent(TimelinePanel);
    fixture.componentRef.setInput('headings', DRAWN.headings);
    fixture.componentRef.setInput('rows', DRAWN.rows);
    fixture.componentRef.setInput('view', mode);
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
        const byTime = await panel(TimelineView.ByTime);
        const byNumber = await panel(TimelineView.ByNumber);
        const zooms: TimelineZoom[] = [];
        const modes: TimelineView[] = [];
        byTime.fixture.componentInstance.zoomTo.subscribe((zoom) => zooms.push(zoom));
        byTime.fixture.componentInstance.viewTo.subscribe((mode) => modes.push(mode));

        byTestId(byTime.host, 'zoom-Top').click();
        byTestId(byTime.host, 'view-ByNumber').click();

        const timeLabel = byTestId(byTime.host, 'zoom-Top').textContent.trim();
        const numberLabel = byTestId(byNumber.host, 'zoom-Top').textContent.trim();
        expect(timeLabel).toBe('Hours');
        expect(numberLabel).toBe('Hundreds');
        expect(zooms).toEqual([TimelineZoom.Top]);
        expect(modes).toEqual([TimelineView.ByNumber]);
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

    it('deletes a branch from its heading only once confirmed, and never Main', async () => {
        const { fixture, host } = await panel();
        const deleted: string[] = [];
        fixture.componentInstance.deleteBranch.subscribe((id) => deleted.push(id));
        const [mainHeading, forkHeading] = all(host, 'branch-heading');
        const mainDelete = mainHeading?.querySelector('[data-testid="branch-delete"]');

        byTestId(forkHeading ?? host, 'branch-delete').click();
        await fixture.whenStable();
        byTestId(host, 'branch-delete-no').click();
        await fixture.whenStable();
        const afterCancel = [...deleted];
        byTestId(forkHeading ?? host, 'branch-delete').click();
        await fixture.whenStable();
        const question = byTestId(host, 'branch-delete-confirm').textContent;
        byTestId(host, 'branch-delete-yes').click();
        await fixture.whenStable();

        const confirms = all(host, 'branch-delete-confirm');
        expect(mainDelete).toBeNull();
        expect(afterCancel).toEqual([]);
        expect(question).toContain('Delete Fork 1 and its own commits?');
        expect(deleted).toEqual(['fork-1']);
        expect(confirms).toHaveLength(0);
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

    it('offers the four views, and asks for the one chosen', async () => {
        const { fixture, host } = await panel(TimelineView.ByOrder);
        const views: TimelineView[] = [];
        fixture.componentInstance.viewTo.subscribe((view) => views.push(view));

        byTestId(host, 'view-ByDriver').click();

        const pressed = all(host, 'view-ByOrder').map((button) =>
            button.getAttribute('aria-pressed'),
        );
        const topLabel = byTestId(host, 'zoom-Top').textContent.trim();
        expect(views).toEqual([TimelineView.ByDriver]);
        expect(pressed).toEqual(['true']);
        expect(topLabel).toBe('Orders');
    });

    it("selects an order from its group's highlight button, which says what it does", async () => {
        const { fixture, host } = await panel(TimelineView.ByOrder);
        const byOrder = ordersDrawn(false);
        const highlighted = ordersDrawn(true);
        fixture.componentRef.setInput('rows', byOrder);
        await fixture.whenStable();
        const chosen: ISubjectChoice[] = [];
        fixture.componentInstance.selectSubject.subscribe((choice) => chosen.push(choice));

        const button = byTestId(host, 'subject-highlight');
        const label = button.getAttribute('aria-label');
        button.click();
        fixture.componentRef.setInput('rows', highlighted);
        await fixture.whenStable();

        const order = byOrder.find((row) => row.subject !== null)!;
        const after = byTestId(host, 'subject-highlight');
        const afterLabel = after.getAttribute('aria-label');
        expect(label).toBe(`Highlight ${order.label} in every view, and show its versions`);
        expect(chosen).toEqual([{ kind: order.kind, key: order.key, subject: order.subject }]);
        expect(afterLabel).toBe(`Stop highlighting ${order.label}`);
    });

    it("opens an order's group from its label", async () => {
        const { fixture, host } = await panel(TimelineView.ByOrder);
        const closed = ordersDrawn(false);
        fixture.componentRef.setInput('rows', closed);
        await fixture.whenStable();
        const toggled: INodeToggle[] = [];
        fixture.componentInstance.openOrClose.subscribe((toggle) => toggled.push(toggle));

        byTestId(host, 'timeline-toggle').click();

        expect(toggled).toEqual([{ key: toggled[0]?.key, isOpen: false }]);
        expect(toggled[0]?.key).toContain('o:');
    });

    it('shows or hides each kind of commit, saying which it would do', async () => {
        const { fixture, host } = await panel();
        const kinds: CommitKind[] = [];
        fixture.componentInstance.toggleKind.subscribe((kind) => kinds.push(kind));
        const hidden = new Set([CommitKind.Job]);
        fixture.componentRef.setInput('hiddenKinds', hidden);
        await fixture.whenStable();

        const jobs = byTestId(host, 'show-Job');
        const state = byTestId(host, 'show-State');
        jobs.click();

        const jobsPressed = jobs.getAttribute('aria-pressed');
        const statePressed = state.getAttribute('aria-pressed');
        const buttons = all(host, 'show-Input');
        expect(kinds).toEqual([CommitKind.Job]);
        expect(jobsPressed).toBe('false');
        expect(statePressed).toBe('true');
        expect(buttons).toHaveLength(1);
    });

    it('sets the gap threshold and shows gaps as a list or an axis, by time only', async () => {
        const { fixture, host } = await panel(TimelineView.ByTime);
        const thresholds: number[] = [];
        const displays: GapDisplay[] = [];
        fixture.componentInstance.thresholdTo.subscribe((ms) => thresholds.push(ms));
        fixture.componentInstance.displayTo.subscribe((display) => displays.push(display));

        const select = byTestId(host, 'gap-threshold') as HTMLSelectElement;
        const change = new Event('change');
        select.value = '300000';
        select.dispatchEvent(change);
        byTestId(host, 'gaps-as-Axis').click();
        const byOrder = await panel(TimelineView.ByOrder);

        const selected = select.selectedOptions[0]?.textContent.trim();
        const elsewhere = all(byOrder.host, 'gap-threshold');
        expect(thresholds).toEqual([300_000]);
        expect(displays).toEqual([GapDisplay.Axis]);
        expect(selected).toBe('5 min');
        expect(elsewhere).toEqual([]);
    });

    it('gives a gap row the space its gap is worth on the axis, and one row in the list', async () => {
        const { fixture, host } = await panel(TimelineView.ByTime);
        const drawn = gapsDrawn();
        const firstGap = drawn.findIndex((row) => row.gapMs !== null);
        const rows = drawn.slice(firstGap - 1, firstGap + 2);
        fixture.componentRef.setInput('rows', rows);
        fixture.componentRef.setInput('gapThresholdMs', 1);
        await fixture.whenStable();
        const inList = all(host, 'timeline-row').filter((row) => row.dataset['gap'] !== undefined);
        const listHeight = inList[0]?.style.getPropertyValue('--gap-height');

        fixture.componentRef.setInput('gapDisplay', GapDisplay.Axis);
        await fixture.whenStable();

        const onAxis = all(host, 'timeline-row').filter((row) => row.dataset['gap'] !== undefined);
        const heights = onAxis.map((row) => row.style.getPropertyValue('--gap-height'));
        const isEachSized = heights.every((height) => height.endsWith('px'));
        expect(inList.length).toBeGreaterThan(0);
        expect(listHeight).toBe('');
        expect(heights.length).toBeGreaterThan(0);
        expect(isEachSized).toBe(true);
    });
});
