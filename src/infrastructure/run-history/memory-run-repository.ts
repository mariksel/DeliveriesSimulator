import { RunRepository } from '../../application-core/run-history/run-repository';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import type { IPersistedRun } from '../simulation-engine/persisted-run';
import { fromPersistedRun, toPersistedRun } from '../simulation-engine/persisted-run';

/**
 * Keeps runs in memory as persisted records, as plain data. Browser storage replaces it in
 * I03-E02-008.
 */
export class MemoryRunRepository extends RunRepository {
    private readonly saved = new Map<string, IPersistedRun>();

    save(name: string, run: IRunState): void {
        const persisted = toPersistedRun(run);
        this.saved.set(name, persisted);
    }

    load(name: string): IRunState | undefined {
        const persisted = this.saved.get(name);
        return persisted === undefined ? undefined : fromPersistedRun(persisted);
    }

    /** What is kept under a name, as it is stored. */
    persisted(name: string): IPersistedRun | undefined {
        return this.saved.get(name);
    }
}
