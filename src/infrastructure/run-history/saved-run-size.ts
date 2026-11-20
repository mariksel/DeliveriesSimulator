import type { IPersistedRun } from '../simulation-engine/persisted-run';

/*
 * How many bytes a saved run takes written out, as browser storage roughly holds it (FND-81). It
 * is counted commit by commit, as a city day written out as one text would be longer than the
 * longest text JavaScript can hold.
 */

/** The highest character code UTF-8 writes in one byte. */
const ONE_BYTE_MAX = 0x7f;
/** The highest character code UTF-8 writes in two bytes. */
const TWO_BYTES_MAX = 0x7ff;
/** The first and last codes of one half of a character outside the basic plane. */
const SURROGATE_FIRST = 0xd800;
const SURROGATE_LAST = 0xdfff;
const ONE_BYTE = 1;
const TWO_BYTES = 2;
/** Each half of a character outside the basic plane, which UTF-8 writes in four bytes. */
const HALF_OF_FOUR_BYTES = 2;
const THREE_BYTES = 3;

/** How many bytes one UTF-16 code unit of a text takes in UTF-8. */
function bytesOfCode(code: number): number {
    if (code <= ONE_BYTE_MAX) {
        return ONE_BYTE;
    }
    if (code <= TWO_BYTES_MAX) {
        return TWO_BYTES;
    }
    return code >= SURROGATE_FIRST && code <= SURROGATE_LAST ? HALF_OF_FOUR_BYTES : THREE_BYTES;
}

/** How many bytes a text takes in UTF-8, without encoding it. */
export function utf8Length(text: string): number {
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
        const code = text.charCodeAt(index);
        bytes += bytesOfCode(code);
    }
    return bytes;
}

/** How many bytes a value takes written out as JSON. */
function jsonBytes(value: unknown): number {
    const text = JSON.stringify(value);
    return utf8Length(text);
}

/** How many bytes a saved run takes written out: its outline, then each commit, one by one. */
export function savedBytes(run: IPersistedRun): number {
    const outline = {
        ...run,
        branches: run.branches.map((branch) => ({ ...branch, commits: [] })),
    };
    const commits = run.branches.flatMap((branch) => branch.commits);
    const commitBytes = commits.reduce((sum, commit) => sum + jsonBytes(commit) + 1, 0);
    return jsonBytes(outline) + commitBytes;
}
