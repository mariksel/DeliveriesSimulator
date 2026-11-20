import type { FunctionLookup } from '../../application-core/simulation-engine/function-lookup';
import { List } from 'immutable';

import type { BuiltInScenarios } from '../../application-core/scenarios/built-in-scenarios';
import type {
    IScenario,
    IScenarioProblem,
    ScenarioResult,
} from '../../application-core/scenarios/scenario';
import type { WallClock } from '../scenarios/live-scenario-run';
import { LiveScenarioRun } from '../scenarios/live-scenario-run';
import type { IChosenFile, ScenarioFiles } from '../../application-core/scenarios/scenario-files';
import { runnableScenario } from '../scenarios/scenario-runner';
import type { Ticker } from '../../application-core/scenarios/ticker';
import { WatchedRun } from './watched-run';
import type { BuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';
import type { ILoadProgress, SavedRunId } from '../../application-core/run-history/saved-run';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import type { ISavedRunStores } from '../run-history/saved-runs';

/** The outside things a session needs. */
export interface IRunSessionParts {
    readonly wallClock: WallClock;
    /** Finds each state function by name and version, which every run carries (FND-81). */
    readonly functions: FunctionLookup;
    readonly ticker: Ticker;
    readonly files: ScenarioFiles;
    readonly builtIns: BuiltInScenarios;
    /** Where saved runs and the scenario versions they ran are stored (FND-81). */
    readonly stores: ISavedRunStores;
    readonly onChange: () => void;
}

/** How opening a scenario ended: it is open, or this is what is wrong with it. */
export type OpenResult =
    { readonly isOk: true } | { readonly isOk: false; readonly problems: List<IScenarioProblem> };

/** How opening a saved run ended: it is open, or why it is not. */
export type OpenSavedResult =
    { readonly isOk: true } | { readonly isOk: false; readonly message: string };

/** The service that holds the run being watched in the browser. Opening a scenario replaces it. */
export class RunSession {
    private watched: WatchedRun | null = null;
    private source: IScenario | null = null;
    private sourceWarnings = List<IScenarioProblem>();

    get run(): WatchedRun | null {
        return this.watched;
    }

    /** What reading the open scenario warned about, such as a rule value outside its range. */
    get warnings(): List<IScenarioProblem> {
        return this.sourceWarnings;
    }

    /** Whether the run being watched has changed since it was last saved or opened. */
    get isUnsaved(): boolean {
        return this.watched?.isUnsaved ?? false;
    }

    constructor(private readonly parts: IRunSessionParts) {}

    /**
     * Opens a scenario, paused at time 0. A scenario that cannot run leaves the current run alone.
     */
    openScenario(read: ScenarioResult): OpenResult {
        const result = runnableScenario(read);
        if (!result.isOk) {
            return result;
        }
        this.watch(result.scenario, result.warnings ?? List());
        this.parts.onChange();
        return { isOk: true };
    }

    openBuiltIn(id: BuiltInScenarioId): OpenResult {
        const result = this.parts.builtIns.scenario(id);
        return this.openScenario(result);
    }

    async openFile(file: IChosenFile): Promise<OpenResult> {
        const result = await this.parts.files.readScenario(file);
        return this.openScenario(result);
    }

    /**
     * Opens a saved run in place of the run being watched, with the scenario version it ran,
     * paused at its latest commit (FND-81). Loading tells its progress, as a run saved at
     * "minimum" is worked out again. A saved run that cannot be opened leaves the current run.
     */
    async openSaved(
        id: SavedRunId,
        onProgress: (progress: ILoadProgress) => void,
    ): Promise<OpenSavedResult> {
        const { runs, scenarios } = this.parts.stores;
        const saved = await runs.find(id);
        const version = saved === undefined ? undefined : await scenarios.version(saved.scenario);
        if (version === undefined) {
            return { isOk: false, message: 'This saved run, or the scenario it ran, is gone.' };
        }
        try {
            const state = await runs.load(id, onProgress);
            if (state === undefined) {
                return { isOk: false, message: 'This saved run is gone.' };
            }
            const noWarnings = List<IScenarioProblem>();
            this.watch(version.scenario, noWarnings, state);
            this.watched?.openedFromSave(id);
            return { isOk: true };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { isOk: false, message: `This saved run could not be opened: ${message}` };
        }
    }

    /** Starts the same scenario afresh. */
    runAgain(): void {
        if (this.source !== null) {
            this.openScenario({ isOk: true, scenario: this.source, warnings: this.warnings });
        }
    }

    /** Watches a run of a scenario, from its start or from a saved run, in place of the last. */
    private watch(scenario: IScenario, warnings: List<IScenarioProblem>, start?: IRunState): void {
        this.watched?.close();
        this.source = scenario;
        this.sourceWarnings = warnings;
        const { wallClock, functions } = this.parts;
        const live = new LiveScenarioRun(scenario, wallClock, functions, start);
        this.watched = new WatchedRun(live, this.parts.ticker, this.parts.onChange);
    }
}
