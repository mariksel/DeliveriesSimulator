import type { IScenario } from './scenario';
import type {
    IScenarioVersion,
    IScenarioVersionRef,
    IStoredScenario,
    ScenarioUser,
} from './scenario-version';

/**
 * Owns what is stored of scenarios, as an unchanging scenario, identified by its name, and a
 * version for each different content, which saved runs share (FND-81). Scenarios owns it, and
 * Run history uses it for the version a saved run ran. Infrastructure implements it, in browser
 * storage; every call is asynchronous, as that storage is.
 */
export abstract class ScenarioRepository {
    /**
     * Stores a scenario, giving its version: the kept one for identical content, every field,
     * or a new one, numbered on from its name's latest.
     */
    abstract store(scenario: IScenario): Promise<IScenarioVersion>;

    /** A kept version, or undefined when none is kept under that name and number. */
    abstract version(ref: IScenarioVersionRef): Promise<IScenarioVersion | undefined>;

    /** Every scenario listed, the deleted ones left out, by name. */
    abstract scenarios(): Promise<readonly IStoredScenario[]>;

    /** Every version kept of a scenario, oldest first. */
    abstract versionsOf(name: string): Promise<readonly IScenarioVersion[]>;

    /** Notes that a saved run uses a kept version, which then stays while it does. */
    abstract noteUse(ref: IScenarioVersionRef, user: ScenarioUser): Promise<void>;

    /** Notes that a saved run no longer uses a version, which goes if nothing else keeps it. */
    abstract releaseUse(ref: IScenarioVersionRef, user: ScenarioUser): Promise<void>;

    /** Deletes a scenario, keeping only the versions saved runs use, until none does. */
    abstract delete(name: string): Promise<void>;
}
