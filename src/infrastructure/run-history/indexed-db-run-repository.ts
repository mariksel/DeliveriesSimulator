import { RunRepository } from '../../application-core/run-history/run-repository';
import type {
    ILoadProgress,
    IRunSize,
    ISaveRequest,
    ISavedRun,
    RunLevel,
    SaveOutcome,
    SavedRunId,
} from '../../application-core/run-history/saved-run';
import {
    RunLevel as Level,
    SaveProblem,
    toSavedRunId,
} from '../../application-core/run-history/saved-run';
import type { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { toCalendarTime } from '../../domain/simulation-engine/numbers';
import { toCount } from '../../domain/system/math/math';
import { toVersionNumber } from '../../domain/system/records/version-chain';
import { REGISTERED_FUNCTIONS } from '../simulation-engine/function-registry';
import type { IPersistedRun } from '../simulation-engine/persisted-run';
import { savedBytes } from './saved-run-size';
import {
    atMinimum,
    fromPersistedRunInChunks,
    toPersistedRun,
    withoutBranch,
} from '../simulation-engine/persisted-run';
import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import { committed, isQuotaExceeded, opened, settled } from '../system/storage/indexed-db';
import type { IPersistedSavedRunBody, IPersistedSavedRunSummary } from './persisted-saved-run';
import {
    isPersistedSavedRunBody,
    isPersistedSavedRunSummary,
    migrated,
    SAVED_RUN_SCHEMA_VERSION,
    withCity,
} from './persisted-saved-run';

/** The database saved runs are stored in, in browser storage. */
export const RUN_DATABASE = 'deliveries-simulator-runs';

const RUNS = 'runs';
const SUMMARIES = 'summaries';
const ID_PREFIX = 'saved-run-';
const BYTES_PER_MB = 1_048_576;

/** A saved run's ID, from the key storage gave it. */
const idOf = (key: number): SavedRunId => toSavedRunId(`${ID_PREFIX}${key}`);

/** The key storage holds a saved run under, or null for an ID it never gave. */
function keyOf(id: SavedRunId): number | null {
    const digits = id.startsWith(ID_PREFIX) ? id.slice(ID_PREFIX.length) : '';
    const key = Number(digits);
    return digits !== '' && Number.isInteger(key) ? key : null;
}

/**
 * Creates the stores the first time the database opens: each run's records, and its summary. A
 * later schema version opens the same stores, and migrates each record as it is read (FND-57).
 */
function created(database: IDBDatabase): void {
    if (!database.objectStoreNames.contains(RUNS)) {
        database.createObjectStore(RUNS, { autoIncrement: true });
    }
    if (!database.objectStoreNames.contains(SUMMARIES)) {
        database.createObjectStore(SUMMARIES);
    }
}

/** A saved run's size: its records' bytes, its commits, and its branches (FND-81). */
function sizeOf(body: IPersistedSavedRunBody): IRunSize {
    const { branches } = body.run;
    const commits = branches.reduce((sum, branch) => sum + branch.commits.length, 0);
    const bytes = savedBytes(body.run);
    return {
        bytes: toCount(bytes),
        commits: toCount(commits),
        branches: toCount(branches.length),
    };
}

const levelOf = (text: string): RunLevel =>
    text === Level.Minimum ? Level.Minimum : Level.Everything;

function fromPersistedSummary(key: number, summary: IPersistedSavedRunSummary): ISavedRun {
    return {
        id: idOf(key),
        name: summary.name,
        level: levelOf(summary.level),
        scenario: {
            name: summary.scenario.name,
            number: toVersionNumber(summary.scenario.number),
        },
        savedAt: toCalendarTime(summary.savedAt),
        size: {
            bytes: toCount(summary.size.bytes),
            commits: toCount(summary.size.commits),
            branches: toCount(summary.size.branches),
        },
    };
}

/** What is told of a saved run, from what storage gave, migrated and checked. */
function summaryFrom(key: number, value: unknown): ISavedRun {
    const record = migrated(value);
    if (!isPersistedSavedRunSummary(record)) {
        throw new Error('A saved run summary is not of the shape this release writes.');
    }
    return fromPersistedSummary(key, record);
}

/**
 * How many commits a load restores between pauses: a few hundred milliseconds of work at
 * "minimum", where each commit's call runs again.
 */
const LOAD_CHUNK = 2000;

/** Progress no one asked to be told. */
const ignoreProgress = (): void => undefined;

/** Why a run could not be saved, for want of room. */
const storageFull = (bytes: number): SaveOutcome => ({
    isOk: false,
    problem: SaveProblem.StorageFull,
    message: `Browser storage has no room for this run, which takes ${Math.ceil(bytes / BYTES_PER_MB)} MB. Nothing was saved.`,
});

/**
 * Stores saved runs in IndexedDB (FND-81): each run's records under a key storage gives, and what
 * is told of it beside them, so listing loads no run. Records carry their schema version, and a
 * chain of migrations brings an older one up to this release's on load. A run that does not fit
 * stores nothing.
 */
export class IndexedDbRunRepository extends RunRepository {
    private opening: Promise<IDBDatabase> | null = null;

    constructor(
        private readonly factory: IDBFactory,
        private readonly functions: FunctionLookup = REGISTERED_FUNCTIONS,
        private readonly databaseName: string = RUN_DATABASE,
    ) {
        super();
    }

    async save(request: ISaveRequest): Promise<SaveOutcome> {
        const everything = toPersistedRun(request.run);
        const run =
            request.level === Level.Minimum
                ? { ...everything, branches: atMinimum(everything.branches) }
                : everything;
        const body: IPersistedSavedRunBody = { schemaVersion: SAVED_RUN_SCHEMA_VERSION, run };
        const size = sizeOf(body);
        const summary: IPersistedSavedRunSummary = {
            schemaVersion: SAVED_RUN_SCHEMA_VERSION,
            name: request.name,
            level: request.level,
            scenario: { name: request.scenario.name, number: request.scenario.number },
            savedAt: request.savedAt,
            size,
        };
        try {
            const key = await this.stored(body, summary);
            return { isOk: true, saved: fromPersistedSummary(key, summary) };
        } catch (error) {
            if (isQuotaExceeded(error)) {
                return storageFull(size.bytes);
            }
            throw error;
        }
    }

    async load(
        id: SavedRunId,
        onProgress: (progress: ILoadProgress) => void = ignoreProgress,
    ): Promise<IRunState | undefined> {
        const key = keyOf(id);
        const body = key === null ? undefined : await this.bodyOf(key);
        if (body === undefined) {
            return undefined;
        }
        return fromPersistedRunInChunks(body.run, this.functions, onProgress, LOAD_CHUNK);
    }

    async moveTo(
        id: SavedRunId,
        level: RunLevel,
        onProgress: (progress: ILoadProgress) => void = ignoreProgress,
    ): Promise<SaveOutcome | undefined> {
        const key = keyOf(id);
        const records = key === null ? undefined : await this.recordsOf(key);
        if (key === null || records === undefined) {
            return undefined;
        }
        const { summary, body } = records;
        if (summary.level === level) {
            return { isOk: true, saved: fromPersistedSummary(key, summary) };
        }
        const run = await this.atLevel(body.run, level, onProgress);
        const moved: IPersistedSavedRunBody = { schemaVersion: SAVED_RUN_SCHEMA_VERSION, run };
        const size = sizeOf(moved);
        const movedSummary: IPersistedSavedRunSummary = { ...summary, level, size };
        try {
            await this.replaced(key, moved, movedSummary);
            return { isOk: true, saved: fromPersistedSummary(key, movedSummary) };
        } catch (error) {
            if (isQuotaExceeded(error)) {
                return storageFull(size.bytes);
            }
            throw error;
        }
    }

    async deleteBranch(id: SavedRunId, branch: BranchId): Promise<SaveOutcome | undefined> {
        const key = keyOf(id);
        const records = key === null ? undefined : await this.recordsOf(key);
        if (key === null || records === undefined) {
            return undefined;
        }
        const { summary, body } = records;
        const run = withoutBranch(body.run, branch);
        if (run === body.run) {
            return { isOk: true, saved: fromPersistedSummary(key, summary) };
        }
        const kept: IPersistedSavedRunBody = { schemaVersion: SAVED_RUN_SCHEMA_VERSION, run };
        const size = sizeOf(kept);
        const keptSummary: IPersistedSavedRunSummary = { ...summary, size };
        await this.replaced(key, kept, keptSummary);
        return { isOk: true, saved: fromPersistedSummary(key, keptSummary) };
    }

    async list(): Promise<readonly ISavedRun[]> {
        const database = await this.database();
        const transaction = database.transaction(SUMMARIES, 'readonly');
        const store = transaction.objectStore(SUMMARIES);
        const keysRequest = store.getAllKeys();
        const keys = await settled(keysRequest);
        const valuesRequest = store.getAll();
        const values = await settled(valuesRequest);
        const allKeys: readonly unknown[] = Array.isArray(keys) ? keys : [];
        const allValues: readonly unknown[] = Array.isArray(values) ? values : [];
        return allKeys.map((key, index) => {
            const number = Number(key);
            return summaryFrom(number, allValues[index]);
        });
    }

    async find(id: SavedRunId): Promise<ISavedRun | undefined> {
        const key = keyOf(id);
        if (key === null) {
            return undefined;
        }
        const database = await this.database();
        const transaction = database.transaction(SUMMARIES, 'readonly');
        const request = transaction.objectStore(SUMMARIES).get(key);
        const value = await settled(request);
        return value === undefined ? undefined : summaryFrom(key, value);
    }

    async delete(id: SavedRunId): Promise<void> {
        const key = keyOf(id);
        if (key === null) {
            return;
        }
        const database = await this.database();
        const transaction = database.transaction([RUNS, SUMMARIES], 'readwrite');
        const done = committed(transaction);
        transaction.objectStore(RUNS).delete(key);
        transaction.objectStore(SUMMARIES).delete(key);
        await done;
    }

    /** The database, opened once, with its stores made on the first open. */
    private database(): Promise<IDBDatabase> {
        this.opening ??= opened(
            this.factory,
            this.databaseName,
            SAVED_RUN_SCHEMA_VERSION,
            created,
        );
        return this.opening;
    }

    /** A saved run's summary and records, or undefined when either is missing. */
    private async recordsOf(
        key: number,
    ): Promise<
        | { readonly summary: IPersistedSavedRunSummary; readonly body: IPersistedSavedRunBody }
        | undefined
    > {
        const summary = await this.summaryRecordOf(key);
        const body = await this.bodyOf(key);
        return summary === undefined || body === undefined ? undefined : { summary, body };
    }

    /** A saved run's records, migrated and checked, or undefined when there are none. */
    private async bodyOf(key: number): Promise<IPersistedSavedRunBody | undefined> {
        const database = await this.database();
        const transaction = database.transaction(RUNS, 'readonly');
        const request = transaction.objectStore(RUNS).get(key);
        const value = await settled(request);
        if (value === undefined) {
            return undefined;
        }
        const record = migrated(value);
        if (!isPersistedSavedRunBody(record)) {
            throw new Error('A saved run is not of the shape this release writes.');
        }
        return withCity(record);
    }

    /** A saved run's summary as stored, migrated and checked, or undefined when there is none. */
    private async summaryRecordOf(key: number): Promise<IPersistedSavedRunSummary | undefined> {
        const database = await this.database();
        const transaction = database.transaction(SUMMARIES, 'readonly');
        const request = transaction.objectStore(SUMMARIES).get(key);
        const value = await settled(request);
        if (value === undefined) {
            return undefined;
        }
        const record = migrated(value);
        if (!isPersistedSavedRunSummary(record)) {
            throw new Error('A saved run summary is not of the shape this release writes.');
        }
        return record;
    }

    /**
     * A saved run's records at another level: down, each change dropped for its digest; up, every
     * root worked out again and each change saved.
     */
    private async atLevel(
        run: IPersistedRun,
        level: RunLevel,
        onProgress: (progress: ILoadProgress) => void,
    ): Promise<IPersistedRun> {
        if (level === Level.Minimum) {
            return { ...run, branches: atMinimum(run.branches) };
        }
        const restored = await fromPersistedRunInChunks(
            run,
            this.functions,
            onProgress,
            LOAD_CHUNK,
        );
        return toPersistedRun(restored);
    }

    /** Replaces a saved run's records and summary together, under its key; nothing if it fails. */
    private async replaced(
        key: number,
        body: IPersistedSavedRunBody,
        summary: IPersistedSavedRunSummary,
    ): Promise<void> {
        const database = await this.database();
        const transaction = database.transaction([RUNS, SUMMARIES], 'readwrite');
        const done = committed(transaction);
        transaction.objectStore(RUNS).put(body, key);
        transaction.objectStore(SUMMARIES).put(summary, key);
        await done;
    }

    /** Stores a run's records and summary together, giving the key; nothing if either fails. */
    private async stored(
        body: IPersistedSavedRunBody,
        summary: IPersistedSavedRunSummary,
    ): Promise<number> {
        const database = await this.database();
        const transaction = database.transaction([RUNS, SUMMARIES], 'readwrite');
        const done = committed(transaction);
        const added = transaction.objectStore(RUNS).add(body);
        const given = await settled(added);
        const key = Number(given);
        transaction.objectStore(SUMMARIES).put(summary, key);
        await done;
        return key;
    }
}
