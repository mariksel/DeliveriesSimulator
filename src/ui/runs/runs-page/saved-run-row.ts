import { MAIN_BRANCH } from '../../../application-core/simulation-engine/branch-id';
import type {
    ISnapshotDifference,
    ISnapshotResult,
} from '../../../application-core/verification/snapshot-test';
import type { ISnapshotResults } from '../../../application/verification/snapshot-tests';
import type { ISavedRun } from '../../../application-core/run-history/saved-run';
import { RunLevel } from '../../../application-core/run-history/saved-run';
import { calendarLabel } from '../../run-history/save-run-form/saved-run-name';

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
/** Below this many MB, a size shows one decimal place. */
const WHOLE_MB_FROM = 10;

/** What a saved run's row on the Runs and scenarios page shows (FND-81). */
export interface ISavedRunRow {
    readonly name: string;
    readonly level: string;
    readonly size: string;
    readonly commits: string;
    readonly branches: string;
    readonly savedAt: string;
    /** The level a move takes it to, and the button's words. */
    readonly otherLevel: RunLevel;
    readonly moveLabel: string;
}

/** A size in bytes as a person reads it: "340 KB", "1.2 MB", or "242 MB". */
export function sizeLabel(bytes: number): string {
    if (bytes < BYTES_PER_MB) {
        const roundedKb = Math.round(bytes / BYTES_PER_KB);
        const kb = Math.max(1, roundedKb);
        return `${kb} KB`;
    }
    const mb = bytes / BYTES_PER_MB;
    const wholeMb = Math.round(mb);
    const shown = mb < WHOLE_MB_FROM ? mb.toFixed(1) : String(wholeMb);
    return `${shown} MB`;
}

/** A count with its noun, one or many: "1 branch", "3 branches". */
const counted = (count: number, one: string, many: string): string =>
    `${count} ${count === 1 ? one : many}`;

/** What a saved run's row shows. */
export function savedRunRow(saved: ISavedRun): ISavedRunRow {
    const isEverything = saved.level === RunLevel.Everything;
    const otherLevel = isEverything ? RunLevel.Minimum : RunLevel.Everything;
    return {
        name: saved.name,
        level: isEverything ? 'Everything' : 'Minimum',
        size: sizeLabel(saved.size.bytes),
        commits: counted(saved.size.commits, 'commit', 'commits'),
        branches: counted(saved.size.branches, 'branch', 'branches'),
        savedAt: calendarLabel(saved.savedAt),
        otherLevel,
        moveLabel: isEverything ? 'Move to minimum' : 'Move to everything',
    };
}

/** One line of what a snapshot test found, and whether it matched. */
export interface ISnapshotLine {
    readonly text: string;
    readonly isMatch: boolean;
}

/** Where a commit is, in words: "commit 12", or "commit 12 of fork-1" off Main. */
const commitLabel = (difference: ISnapshotDifference): string =>
    difference.branch === MAIN_BRANCH
        ? `commit ${difference.place}`
        : `commit ${difference.place} of ${difference.branch}`;

/** What one snapshot test found, in words. */
function snapshotLine(label: string, result: ISnapshotResult): ISnapshotLine {
    if (result.difference === null) {
        return { text: `${label}: all ${result.compared} state commits match.`, isMatch: true };
    }
    const where = commitLabel(result.difference);
    return { text: `${label}: ${where} is the first to differ.`, isMatch: false };
}

/**
 * What a saved run's row shows of its snapshot tests: one line with its own versions, one with the
 * newest, and, when either differs, that opening the run shows the commit (FND-81).
 */
export function snapshotLines(results: ISnapshotResults): readonly ISnapshotLine[] {
    const own = snapshotLine('With its own versions', results.own);
    const newest = snapshotLine('With the newest versions', results.newest);
    const isMatch = own.isMatch && newest.isMatch;
    const opening = isMatch
        ? []
        : [{ text: 'Opening the run shows the first commit that differs.', isMatch: false }];
    return [own, newest, ...opening];
}
