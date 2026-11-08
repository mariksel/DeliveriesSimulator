import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { MAIN_BRANCH } from '../../application-core/simulation-engine/branch-id';
import { DRIVER_IGNORES } from '../../application-core/simulation-engine/indirect-effects.testing';
import { branchLinesOf } from '../../application-core/simulation-engine/run-branches';
import type {
    IIndirectInput,
    IRunInput,
    ScriptInput,
} from '../../application-core/simulation-engine/run-input';
import {
    toIndirectLabel,
    toInputActor,
    toInputOrderName,
} from '../../application-core/simulation-engine/run-input';
import { scheduleInputs } from '../../application-core/simulation-engine/run-inputs';
import { createRun } from '../../application-core/simulation-engine/run-state';
import { HAPPY_PATH, START } from '../../application/simulation-engine/one-order-run.testing';
import { SimulationRun } from '../../application/simulation-engine/simulation-run';
import { toSeed } from '../../domain/simulation-engine/numbers';
import { toSimTime } from '../../domain/simulation-engine/sim-time';
import { toPosition } from '../../domain/system/math/math';
import { lineThrough, RowMode, timelineGrid, timelineRows } from './timeline-grid';
import type { ITimelineCell, ITimelineRowView } from './timeline-view';
import { timelineRowViews } from './timeline-view';

const IGNORED_MS = 45_000;
const FOLLOWED_MS = 70_000;

/** The one-order run, with the driver ignoring the request, then a call that follows from it. */
function runWithAnUnawareSpan(): SimulationRun {
    const ignored: IIndirectInput = { at: toSimTime(IGNORED_MS), indirect: DRIVER_IGNORES };
    const followed: IRunInput = {
        at: toSimTime(FOLLOWED_MS),
        actor: toInputActor('driver-1'),
        command: 'accept',
        order: toInputOrderName('A'),
        after: toIndirectLabel('ignored'),
    };
    const steps = List<ScriptInput>([...HAPPY_PATH, ignored, followed]);
    const created = createRun({ seed: toSeed(1) });
    const start = scheduleInputs(created, START, steps);
    const run = new SimulationRun(start);
    const end = toSimTime(300_000);
    run.advanceTo(end);
    return run;
}

const RUN = runWithAnUnawareSpan().state;
const LINES = branchLinesOf(RUN).toArray();
const GRID = timelineGrid(LINES, RowMode.ByTime);

/** The rows drawn with every group open, or every group closed. */
function drawn(isOpen: boolean): readonly ITimelineRowView[] {
    const open = (): boolean => isOpen;
    const rows = timelineRows(GRID.nodes, open);
    const line = lineThrough(GRID.columns, MAIN_BRANCH);
    const place = toPosition(RUN.line.commits.size);
    const context = { currentBranch: MAIN_BRANCH, line, place, selected: null, isOpen: open };
    return timelineRowViews(rows, GRID.columns, context);
}

/** Main's cell in each row, in order. */
const mainCells = (views: readonly ITimelineRowView[]): readonly ITimelineCell[] =>
    views.flatMap((view) => view.cells.filter((cell) => cell.column === MAIN_BRANCH));

describe('the span the service was unaware', () => {
    const opened = drawn(true);
    const cells = mainCells(opened);
    const commits = cells.filter((cell) => cell.mark !== null);
    const start = cells.findIndex((cell) => cell.mark === 'Indirect');
    const end = cells.findIndex((cell) => cell.unaware?.part === 'end');

    it("marks the indirect commit as unseen, by its kind's name", () => {
        const indirect = commits.find((cell) => cell.mark === 'Indirect');

        expect(indirect?.text).toContain('A driver ignores a request');
        expect(indirect?.tooltip).toContain('which the service did not see');
        expect(indirect?.unaware?.part).toBe('start');
    });

    it('runs from the indirect commit to the call that followed from it, with how long', () => {
        const between = cells.slice(start + 1, end).map((cell) => cell.unaware?.part);
        const after = cells.slice(end + 1).map((cell) => cell.unaware);
        const ended = cells[end];

        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        const betweenParts = [...new Set(between)];
        expect(betweenParts).toEqual(['middle']);
        expect(ended?.mark).toBe('Input');
        expect(ended?.unaware?.text).toBe('Unaware for h00:m00:s25:ms00');
        const afterParts = [...new Set(after)];
        expect(afterParts).toEqual([null]);
    });

    it('is whole in a closed group that holds both ends', () => {
        const closedRows = drawn(false);
        const closed = mainCells(closedRows);
        const parts = closed.map((cell) => cell.unaware?.part ?? null);

        expect(parts).toContain('whole');
        expect(parts).not.toContain('start');
    });
});
