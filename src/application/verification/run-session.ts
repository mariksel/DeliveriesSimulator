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

/** The outside things a session needs. */
export interface IRunSessionParts {
    readonly wallClock: WallClock;
    readonly ticker: Ticker;
    readonly files: ScenarioFiles;
    readonly builtIns: BuiltInScenarios;
    readonly onChange: () => void;
}

/** How opening a scenario ended: it is open, or this is what is wrong with it. */
export type OpenResult =
    { readonly isOk: true } | { readonly isOk: false; readonly problems: List<IScenarioProblem> };

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

    constructor(private readonly parts: IRunSessionParts) {}

    /**
     * Opens a scenario, paused at time 0. A scenario that cannot run leaves the current run alone.
     */
    openScenario(read: ScenarioResult): OpenResult {
        const result = runnableScenario(read);
        if (!result.isOk) {
            return result;
        }
        this.watched?.close();
        this.source = result.scenario;
        this.sourceWarnings = result.warnings ?? List();
        const live = new LiveScenarioRun(result.scenario, this.parts.wallClock);
        this.watched = new WatchedRun(live, this.parts.ticker, this.parts.onChange);
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

    /** Starts the same scenario afresh. */
    runAgain(): void {
        if (this.source !== null) {
            this.openScenario({ isOk: true, scenario: this.source, warnings: this.warnings });
        }
    }
}
