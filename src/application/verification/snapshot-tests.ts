import type { RunRepository } from '../../application-core/run-history/run-repository';
import type { SavedRunId } from '../../application-core/run-history/saved-run';
import type { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import { isRebuildMismatch } from '../../application-core/simulation-engine/rebuild-root';
import type { ISnapshotResult } from '../../application-core/verification/snapshot-test';
import { SnapshotVersions, snapshotTest } from '../../application-core/verification/snapshot-test';
import { toCount } from '../../domain/system/math/math';

/** Both snapshot tests of a saved run: with its own versions, and with the newest. */
export interface ISnapshotResults {
    readonly own: ISnapshotResult;
    readonly newest: ISnapshotResult;
}

/**
 * Both snapshot tests of a saved run, read once through Run history (FND-81): its stored calls
 * rerun with its own versions and with the newest, through a lookup that holds every version, the
 * loaded run's own unless one is given. A run saved at "minimum" works each root out again as it
 * opens, against its digest, so a root that came out differently then is the first difference of
 * both, as the newest versions cannot be tried on a run that does not open. Undefined when there
 * is no such saved run.
 */
export async function snapshotTestsOfSaved(
    runs: RunRepository,
    id: SavedRunId,
    functions?: FunctionLookup,
): Promise<ISnapshotResults | undefined> {
    try {
        const run = await runs.load(id);
        if (run === undefined) {
            return undefined;
        }
        const lookup = functions ?? run.functions;
        const own = snapshotTest(run, SnapshotVersions.Own, lookup);
        const newest = snapshotTest(run, SnapshotVersions.Newest, lookup);
        return { own, newest };
    } catch (error) {
        if (!isRebuildMismatch(error)) {
            throw error;
        }
        const { branch, place, commit } = error;
        const difference = { branch, place, commit };
        const compared = toCount(place);
        return {
            own: { versions: SnapshotVersions.Own, compared, difference },
            newest: { versions: SnapshotVersions.Newest, compared, difference },
        };
    }
}
