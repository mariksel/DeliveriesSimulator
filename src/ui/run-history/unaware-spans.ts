import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import type { CommitId } from '../../application-core/simulation-engine/commit-id';
import type { ICommit } from '../../application-core/simulation-engine/commit';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import { formatClockTime } from '../../domain/simulation-engine/clock-time';
import type { Position } from '../../domain/system/math/math';
import type { IGridCommit, IsOpen, ITimelineRow } from './timeline-grid';
import { holdsPlace, NodeKind } from './timeline-grid';

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

/**
 * Each row's part of a span, by column, by the row's index; a row outside every span is left
 * out, and so is a column, so a long run with no span builds nothing.
 */
export type UnawareRows = ReadonlyMap<number, ReadonlyMap<BranchId, IUnaware>>;

/** Whether a commit is a call that followed from an indirect commit (FND-89). */
const isFollowingCall = (commit: ICommit): boolean =>
    commit.kind === CommitKind.Input &&
    commit.effect?.kind === EffectKind.Input &&
    commit.effect.followsFrom !== null;

/** A commit's key in its column, as a commit's ID is unique only along its own line. */
const keyIn = (column: BranchId, id: CommitId): string => `${column}:${id}`;

/**
 * The spans the service was unaware: from each indirect commit to each call that names it, when
 * both are in the same column. The top-level rows hold every commit, so it walks only them, in
 * one pass that builds nothing for the many commits that are neither, as it runs on every change.
 * By order or by driver a commit can sit under several groups, so each call is taken once.
 */
function spansOf(rows: readonly ITimelineRow[]): readonly ISpan[] {
    const indirects = new Map<string, IGridCommit>();
    const calls = new Map<string, IGridCommit>();
    rows.forEach((row) => {
        if (row.depth !== 0 || row.entry !== null) {
            return;
        }
        row.node.commits.forEach((own) => {
            own.forEach((each) => {
                const { commit } = each;
                // Most commits are neither, and their kind alone says so.
                const isIndirect = commit.kind === CommitKind.Indirect;
                if (isIndirect || isFollowingCall(commit)) {
                    const key = keyIn(each.column, commit.id);
                    (isIndirect ? indirects : calls).set(key, each);
                }
            });
        });
    });
    return [...calls.values()].flatMap((each) => {
        const { effect, at } = each.commit;
        if (effect?.kind !== EffectKind.Input || effect.followsFrom === null) {
            return [];
        }
        const key = keyIn(each.column, effect.followsFrom);
        const from = indirects.get(key);
        if (from === undefined) {
            return [];
        }
        const unaware = at.milliseconds - from.commit.at.milliseconds;
        const text = `Unaware for ${formatClockTime(unaware)}`;
        return [{ column: each.column, from: from.place, to: each.place, text }];
    });
}

/**
 * The commits a row draws in a column, oldest first, or null for none, as an open group's own
 * row draws.
 */
function drawnPlaces(
    row: ITimelineRow,
    column: BranchId,
    isOpen: IsOpen,
): readonly IGridCommit[] | null {
    const isHeader = row.node.kind !== NodeKind.Commit && isOpen(row.node);
    const own = row.node.commits.get(column);
    if (isHeader || own === undefined || own.length === 0) {
        return null;
    }
    return own;
}

/** How far a walk down the rows has got through one span. */
const SpanState = { Before: 0, Inside: 1, After: 2 } as const;
type SpanState = (typeof SpanState)[keyof typeof SpanState];

interface IStep {
    readonly part: IUnaware | null;
    readonly state: SpanState;
}

/** Whether a row's commits hold one at a place: under an order or a driver, they skip some. */
const holds = (places: readonly IGridCommit[], at: Position): boolean => holdsPlace(places, at);

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
    const parts = new Map<number, Map<BranchId, IUnaware>>();
    spansOf(rows).forEach((span) => {
        let state: SpanState = SpanState.Before;
        rows.forEach((row, index) => {
            const step = stepThrough(span, row, state, isOpen);
            state = step.state;
            if (step.part !== null) {
                const part = parts.get(index) ?? new Map<BranchId, IUnaware>();
                parts.set(index, part);
                part.set(span.column, step.part);
            }
        });
    });
    return parts;
}
