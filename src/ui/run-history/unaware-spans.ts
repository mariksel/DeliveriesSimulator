import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import type { CommitId } from '../../application-core/simulation-engine/commit-id';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import type { Position } from '../../domain/system/math/math';
import type { IGridCommit, IsOpen, ITimelineRow } from './timeline-grid';
import { NodeKind } from './timeline-grid';

/** Where a row sits in a span the service was unaware of what had happened (FND-89). */
export const UnawarePart = {
    /** The row of the indirect commit, where the span starts. */
    Start: 'start',
    Middle: 'middle',
    /** The row of the call that followed from it, where the span ends. */
    End: 'end',
    /** A closed group holding both ends. */
    Whole: 'whole',
} as const;

/** One of the values of {@link UnawarePart}. */
export type UnawarePart = (typeof UnawarePart)[keyof typeof UnawarePart];

/** A row's part of a span, and, where it ends, how long the service was unaware. */
export interface IUnaware {
    readonly part: UnawarePart;
    readonly text: string | null;
}

/** An indirect commit and the call that followed from it, in one column. */
interface ISpan {
    readonly column: BranchId;
    readonly from: Position;
    readonly to: Position;
    readonly text: string;
}

/** Each row's part of a span, by column; a column outside every span is left out. */
export type UnawareRows = readonly ReadonlyMap<BranchId, IUnaware>[];

/** Every commit of the rows once: the top-level rows hold all of them. */
function allCommits(rows: readonly ITimelineRow[]): readonly IGridCommit[] {
    return rows
        .filter((row) => row.depth === 0 && row.entry === null)
        .flatMap((row) => [...row.node.commits.values()].flat());
}

/**
 * The spans the service was unaware: from each indirect commit to each call that names it, when
 * both are in the same column.
 */
function spansOf(rows: readonly ITimelineRow[]): readonly ISpan[] {
    const commits = allCommits(rows);
    const pairs = commits.flatMap((each): (readonly [CommitId, IGridCommit])[] =>
        each.commit.indirect === null ? [] : [[each.commit.id, each]],
    );
    const indirects = new Map<CommitId, IGridCommit>(pairs);
    return commits.flatMap((each) => {
        const { effect, at } = each.commit;
        if (effect?.kind !== EffectKind.Input || effect.followsFrom === null) {
            return [];
        }
        const from = indirects.get(effect.followsFrom);
        if (from?.column !== each.column) {
            return [];
        }
        const unaware = at.milliseconds - from.commit.at.milliseconds;
        const text = `Unaware for ${formatClockTime(unaware)}`;
        return [{ column: each.column, from: from.place, to: each.place, text }];
    });
}

/** The first and last place a row draws in a column. */
interface IPlaces {
    readonly first: Position;
    readonly last: Position;
}

/** The places a row draws in a column, or null for none, as an open group's own row draws. */
function drawnPlaces(row: ITimelineRow, column: BranchId, isOpen: IsOpen): IPlaces | null {
    const isHeader = row.node.kind !== NodeKind.Commit && isOpen(row.node);
    const own = row.node.commits.get(column);
    const first = own?.[0];
    const last = own?.at(-1);
    if (isHeader || first === undefined || last === undefined) {
        return null;
    }
    return { first: first.place, last: last.place };
}

/** How far a walk down the rows has got through one span. */
const SpanState = { Before: 0, Inside: 1, After: 2 } as const;
type SpanState = (typeof SpanState)[keyof typeof SpanState];

interface IStep {
    readonly part: IUnaware | null;
    readonly state: SpanState;
}

const holds = (places: IPlaces, at: Position): boolean => places.first <= at && at <= places.last;

/** A row's part of a span, given how far the walk has got, and where the walk goes next. */
function stepThrough(span: ISpan, row: ITimelineRow, state: SpanState, isOpen: IsOpen): IStep {
    const places = drawnPlaces(row, span.column, isOpen);
    if (state === SpanState.After) {
        return { part: null, state };
    }
    if (places === null) {
        const part = state === SpanState.Inside ? { part: UnawarePart.Middle, text: null } : null;
        return { part, state };
    }
    if (state === SpanState.Before) {
        if (!holds(places, span.from)) {
            return { part: null, state };
        }
        return holds(places, span.to)
            ? { part: { part: UnawarePart.Whole, text: span.text }, state: SpanState.After }
            : { part: { part: UnawarePart.Start, text: null }, state: SpanState.Inside };
    }
    // A commit's events come after its own row, so the call's events are past the span.
    return holds(places, span.to) && row.entry === null
        ? { part: { part: UnawarePart.End, text: span.text }, state: SpanState.After }
        : { part: { part: UnawarePart.Middle, text: null }, state };
}

/**
 * Each row's part of a span the service was unaware: from an indirect commit, which it does not
 * see, to the call that followed from it (FND-89).
 */
export function unawareRows(rows: readonly ITimelineRow[], isOpen: IsOpen): UnawareRows {
    const parts = rows.map(() => new Map<BranchId, IUnaware>());
    spansOf(rows).forEach((span) => {
        let state: SpanState = SpanState.Before;
        rows.forEach((row, index) => {
            const step = stepThrough(span, row, state, isOpen);
            state = step.state;
            if (step.part !== null) {
                parts[index]?.set(span.column, step.part);
            }
        });
    });
    return parts;
}
