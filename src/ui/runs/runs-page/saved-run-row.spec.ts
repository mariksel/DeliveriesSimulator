import { describe, expect, it } from 'vitest';

import type { ISavedRun } from '../../../application-core/run-history/saved-run';
import { RunLevel, toSavedRunId } from '../../../application-core/run-history/saved-run';
import { toCalendarTime } from '../../../domain/simulation-engine/numbers';
import { toCount } from '../../../domain/system/math/math';
import { toVersionNumber } from '../../../domain/system/records/version-chain';
import { savedRunRow, sizeLabel, snapshotLines } from './saved-run-row';
import { toBranchId } from '../../../application-core/simulation-engine/branch-id';
import { toCommitId } from '../../../application-core/simulation-engine/commit-id';
import type { ISnapshotResult } from '../../../application-core/verification/snapshot-test';
import { SnapshotVersions } from '../../../application-core/verification/snapshot-test';
import { toPosition } from '../../../domain/system/math/math';

const KB = 1024;
const MB = KB * KB;

/** A saved run of a size, at a level. */
function savedRun(level: RunLevel, commits: number, branches: number): ISavedRun {
    return {
        id: toSavedRunId('saved-run-1'),
        name: 'My run',
        level,
        scenario: { name: 'One order', number: toVersionNumber(1) },
        savedAt: toCalendarTime(0),
        size: { bytes: toCount(2 * MB), commits: toCount(commits), branches: toCount(branches) },
    };
}

describe("a saved run's row", () => {
    it.each<[number, string]>([
        [100, '1 KB'],
        [340 * KB, '340 KB'],
        [1.24 * MB, '1.2 MB'],
        [242.4 * MB, '242 MB'],
    ])('shows %i bytes as %s', (bytes, shown) => {
        const label = sizeLabel(bytes);

        expect(label).toBe(shown);
    });

    it('shows a run at everything, with a move to minimum', () => {
        const saved = savedRun(RunLevel.Everything, 74_624, 2);

        const row = savedRunRow(saved);

        expect(row).toMatchObject({
            name: 'My run',
            level: 'Everything',
            size: '2.0 MB',
            commits: '74624 commits',
            branches: '2 branches',
            otherLevel: RunLevel.Minimum,
            moveLabel: 'Move to minimum',
        });
    });

    it('shows a run at minimum, with a move to everything, one commit and one branch', () => {
        const saved = savedRun(RunLevel.Minimum, 1, 1);

        const row = savedRunRow(saved);

        expect(row).toMatchObject({
            level: 'Minimum',
            commits: '1 commit',
            branches: '1 branch',
            otherLevel: RunLevel.Everything,
            moveLabel: 'Move to everything',
        });
    });
});

describe("what a saved run's row shows of its snapshot tests", () => {
    const matched = (versions: SnapshotVersions): ISnapshotResult => ({
        versions,
        compared: toCount(57),
        difference: null,
    });

    it('says every commit matches, both ways', () => {
        const results = {
            own: matched(SnapshotVersions.Own),
            newest: matched(SnapshotVersions.Newest),
        };

        const lines = snapshotLines(results);

        expect(lines).toEqual([
            { text: 'With its own versions: all 57 state commits match.', isMatch: true },
            { text: 'With the newest versions: all 57 state commits match.', isMatch: true },
        ]);
    });

    it('names the first commit that differs, and its branch off Main, and that opening shows it', () => {
        const fork = toBranchId('fork-1');
        const newest: ISnapshotResult = {
            versions: SnapshotVersions.Newest,
            compared: toCount(12),
            difference: { branch: fork, place: toPosition(12), commit: toCommitId('commit-12') },
        };
        const results = { own: matched(SnapshotVersions.Own), newest };

        const lines = snapshotLines(results);

        const texts = lines.map((line) => line.text);
        expect(texts).toEqual([
            'With its own versions: all 57 state commits match.',
            'With the newest versions: commit 12 of fork-1 is the first to differ.',
            'Opening the run shows the first commit that differs.',
        ]);
    });
});
