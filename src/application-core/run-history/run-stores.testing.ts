import type { IScenario } from '../scenarios/scenario';
import { ScenarioRepository } from '../scenarios/scenario-repository';
import type {
    IScenarioVersion,
    IScenarioVersionRef,
    IStoredScenario,
} from '../scenarios/scenario-version';
import type { IRunState } from '../simulation-engine/run-state';
import type { BranchId } from '../simulation-engine/branch-id';
import { deleteBranch } from '../simulation-engine/run-branches';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { toCount } from '../../domain/system/math/math';
import type { CalendarTime } from '../../domain/simulation-engine/numbers';
import { toCalendarTime } from '../../domain/simulation-engine/numbers';
import { Calendar } from './calendar';
import { RunRepository } from './run-repository';
import type {
    ILoadProgress,
    ISaveRequest,
    ISavedRun,
    RunLevel,
    SaveOutcome,
    SavedRunId,
} from './saved-run';
import { SaveProblem, toSavedRunId } from './saved-run';

/** A saved run as these stores hold it: what is told of it, and the run itself. */
interface IHeld {
    readonly saved: ISavedRun;
    readonly run: IRunState;
}

/** The bytes each commit is said to take, a made-up size. */
const BYTES_PER_COMMIT = 100;

/** What a full browser storage says, as the real repository words it. */
export const STORAGE_FULL_MESSAGE =
    'Browser storage has no room for this run, which takes 1 MB. Nothing was saved.';

/** A calendar a test sets by hand. */
export class ManualCalendar extends Calendar {
    time = toCalendarTime(0);

    now(): CalendarTime {
        return this.time;
    }
}

/**
 * Saved runs kept in memory, for screen tests: each run is held as it was given, and its size is
 * made up. A test can make every save find storage full.
 */
export class MemoryRunRepository extends RunRepository {
    private readonly held = new Map<SavedRunId, IHeld>();
    private made = 0;
    /** Whether storage is full, so that saving stores nothing. */
    isFull = false;

    save(request: ISaveRequest): Promise<SaveOutcome> {
        if (this.isFull) {
            return Promise.resolve({
                isOk: false,
                problem: SaveProblem.StorageFull,
                message: STORAGE_FULL_MESSAGE,
            });
        }
        this.made += 1;
        const id = toSavedRunId(`saved-run-${this.made}`);
        const { name, level, scenario, savedAt, run } = request;
        const commits = toCount(run.line.commits.size);
        const branches = toCount(run.history.branches.size);
        const size = { bytes: toCount(commits * BYTES_PER_COMMIT), commits, branches };
        const saved: ISavedRun = { id, name, level, scenario, savedAt, size };
        this.held.set(id, { saved, run });
        return Promise.resolve({ isOk: true, saved });
    }

    load(
        id: SavedRunId,
        onProgress?: (progress: ILoadProgress) => void,
    ): Promise<IRunState | undefined> {
        const found = this.held.get(id);
        if (found !== undefined) {
            const { commits } = found.saved.size;
            onProgress?.({ done: commits, total: commits });
        }
        return Promise.resolve(found?.run);
    }

    moveTo(id: SavedRunId, level: RunLevel): Promise<SaveOutcome | undefined> {
        const found = this.held.get(id);
        if (found === undefined) {
            return Promise.resolve(undefined);
        }
        const saved = { ...found.saved, level };
        this.held.set(id, { ...found, saved });
        return Promise.resolve({ isOk: true, saved });
    }

    deleteBranch(id: SavedRunId, branch: BranchId): Promise<SaveOutcome | undefined> {
        const found = this.held.get(id);
        if (found === undefined) {
            return Promise.resolve(undefined);
        }
        const isHeld = found.run.history.branches.has(branch);
        const run = isHeld ? deleteBranch(found.run, branch) : found.run;
        const branches = toCount(run.history.branches.size);
        const saved = { ...found.saved, size: { ...found.saved.size, branches } };
        this.held.set(id, { saved, run });
        return Promise.resolve({ isOk: true, saved });
    }

    list(): Promise<readonly ISavedRun[]> {
        const all = [...this.held.values()].map((each) => each.saved);
        return Promise.resolve(all);
    }

    find(id: SavedRunId): Promise<ISavedRun | undefined> {
        const found = this.held.get(id);
        return Promise.resolve(found?.saved);
    }

    delete(id: SavedRunId): Promise<void> {
        this.held.delete(id);
        return Promise.resolve();
    }
}

/** Scenario versions kept in memory, for screen tests: one version of each scenario stored. */
export class MemoryScenarioRepository extends ScenarioRepository {
    private readonly versions = new Map<string, IScenarioVersion>();

    store(scenario: IScenario): Promise<IScenarioVersion> {
        const version = { name: scenario.name, number: toVersionNumber(1), scenario };
        this.versions.set(scenario.name, version);
        return Promise.resolve(version);
    }

    version(ref: IScenarioVersionRef): Promise<IScenarioVersion | undefined> {
        const found = this.versions.get(ref.name);
        return Promise.resolve(found);
    }

    scenarios(): Promise<readonly IStoredScenario[]> {
        const stored = [...this.versions.values()].map((version) => ({
            name: version.name,
            latest: version.number,
            isDeleted: false,
        }));
        return Promise.resolve(stored);
    }

    versionsOf(name: string): Promise<readonly IScenarioVersion[]> {
        const found = this.versions.get(name);
        return Promise.resolve(found === undefined ? [] : [found]);
    }

    noteUse(): Promise<void> {
        return Promise.resolve();
    }

    releaseUse(): Promise<void> {
        return Promise.resolve();
    }

    delete(name: string): Promise<void> {
        this.versions.delete(name);
        return Promise.resolve();
    }
}
