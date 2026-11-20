import type { RunRepository } from '../../application-core/run-history/run-repository';
import type {
    RunLevel,
    SaveOutcome,
    SavedRunId,
} from '../../application-core/run-history/saved-run';
import type { IScenario } from '../../application-core/scenarios/scenario';
import type { ScenarioRepository } from '../../application-core/scenarios/scenario-repository';
import { toScenarioUser } from '../../application-core/scenarios/scenario-version';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import type { CalendarTime } from '../../domain/simulation-engine/numbers';

/** Where saved runs and the scenario versions they ran are stored. */
export interface ISavedRunStores {
    readonly runs: RunRepository;
    readonly scenarios: ScenarioRepository;
}

/** A run to save, with the scenario it ran, a built-in one included. */
export interface IRunToSave {
    readonly name: string;
    readonly level: RunLevel;
    readonly scenario: IScenario;
    readonly savedAt: CalendarTime;
    readonly run: IRunState;
}

/**
 * Saves a run at a level (FND-81): its scenario is stored first, as a version saved runs share,
 * then the run, pointing at that version, which then notes the run's use of it, so it stays while
 * the run does. A run that does not fit is not saved, and the version notes no use.
 */
export async function saveRun(stores: ISavedRunStores, save: IRunToSave): Promise<SaveOutcome> {
    const version = await stores.scenarios.store(save.scenario);
    const scenario = { name: version.name, number: version.number };
    const outcome = await stores.runs.save({ ...save, scenario });
    if (outcome.isOk) {
        const user = toScenarioUser(outcome.saved.id);
        await stores.scenarios.noteUse(scenario, user);
    }
    return outcome;
}

/** Deletes a saved run, and releases its use of the scenario version it ran. */
export async function deleteSavedRun(stores: ISavedRunStores, id: SavedRunId): Promise<void> {
    const saved = await stores.runs.find(id);
    if (saved === undefined) {
        return;
    }
    await stores.runs.delete(id);
    const user = toScenarioUser(id);
    await stores.scenarios.releaseUse(saved.scenario, user);
}
