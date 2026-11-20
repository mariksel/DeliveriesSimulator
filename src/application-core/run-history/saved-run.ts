import type { IScenarioVersionRef } from '../scenarios/scenario-version';
import type { Count } from '../../domain/system/math/math';
import type { CalendarTime } from '../../domain/simulation-engine/numbers';
import type { IRunState } from '../simulation-engine/run-state';

/** Identifies a saved run: the repository gives each save its own, so names repeat (FND-81). */
export type SavedRunId = string & { readonly brand: 'SavedRunId' };
/** Makes a {@link SavedRunId} from a string. */
export const toSavedRunId = (value: string): SavedRunId => value as SavedRunId;

/**
 * How much of a run a save keeps (FND-81): everything, or the minimum, which drops each commit's
 * main root and rebuilds it on load. Checkpoints come at the city stage.
 */
export const RunLevel = {
    Everything: 'Everything',
    Minimum: 'Minimum',
} as const;

/** One of the values of {@link RunLevel}. */
export type RunLevel = (typeof RunLevel)[keyof typeof RunLevel];

/** How big a saved run is: the bytes it takes in browser storage, its commits, and branches. */
export interface IRunSize {
    readonly bytes: Count;
    readonly commits: Count;
    readonly branches: Count;
}

/** What is told of a saved run without loading it: who it is, what it ran, and its size. */
export interface ISavedRun {
    readonly id: SavedRunId;
    /** A label only, which another saved run may share. */
    readonly name: string;
    readonly level: RunLevel;
    /** The scenario version it ran, which stays stored while this run is. */
    readonly scenario: IScenarioVersionRef;
    /** When it was saved, on the calendar, which tells saved runs of one name apart. */
    readonly savedAt: CalendarTime;
    readonly size: IRunSize;
}

/** What to save: the run, and what is told of it. */
export interface ISaveRequest {
    readonly name: string;
    readonly level: RunLevel;
    readonly scenario: IScenarioVersionRef;
    readonly savedAt: CalendarTime;
    readonly run: IRunState;
}

/** How far opening a saved run has got: the commits restored, of all it holds. */
export interface ILoadProgress {
    readonly done: Count;
    readonly total: Count;
}

/** Why a save failed. */
export const SaveProblem = {
    /** Browser storage has no room for it. */
    StorageFull: 'StorageFull',
} as const;

/** One of the values of {@link SaveProblem}. */
export type SaveProblem = (typeof SaveProblem)[keyof typeof SaveProblem];

/** How a save ended: the saved run, or why nothing was stored. */
export type SaveOutcome =
    | { readonly isOk: true; readonly saved: ISavedRun }
    | { readonly isOk: false; readonly problem: SaveProblem; readonly message: string };
