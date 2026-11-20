import { List, Set as ImmutableSet } from 'immutable';

import type { VersionNumber } from '../../domain/system/records/version-chain';
import { FIRST_VERSION, toVersionNumber } from '../../domain/system/records/version-chain';
import { required } from '../../domain/system/validation/required';
import type { IScenario } from './scenario';
import type {
    IScenarioVersion,
    IStoredScenario,
    ScenarioContentKey,
    ScenarioUser,
} from './scenario-version';

/** One version as storage keeps it: the version, its content key, and the saved runs using it. */
export interface IShelvedVersion {
    readonly version: IScenarioVersion;
    readonly contentKey: ScenarioContentKey;
    readonly users: ImmutableSet<ScenarioUser>;
}

/**
 * One name's scenario and every version kept of it, oldest first: what storing, using, and
 * deleting a scenario change, as pure functions, so every storage behaves the same (FND-81).
 */
export interface IShelfEntry {
    /** The scenario, or null for a name with nothing kept. */
    readonly scenario: IStoredScenario | null;
    readonly versions: List<IShelvedVersion>;
}

/** A name nothing is kept under. */
export const EMPTY_ENTRY: IShelfEntry = { scenario: null, versions: List() };

/** What storing a scenario came to: the entry after it, and the version the scenario is. */
export interface IStored {
    readonly entry: IShelfEntry;
    readonly version: IScenarioVersion;
}

/**
 * Stores a scenario under its name: content identical to a kept version is that version, and
 * different content is a new version, numbered on from the latest (FND-81). Storing a deleted
 * scenario's name again lists it again, carrying its numbering on.
 */
export function storedIn(
    entry: IShelfEntry,
    scenario: IScenario,
    contentKey: ScenarioContentKey,
): IStored {
    const { name } = scenario;
    const same = entry.versions.find((kept) => kept.contentKey === contentKey);
    const latest = entry.scenario?.latest ?? null;
    if (same !== undefined) {
        const kept = latest ?? same.version.number;
        const listed: IStoredScenario = { name, latest: kept, isDeleted: false };
        return { entry: { ...entry, scenario: listed }, version: same.version };
    }
    const number = latest === null ? FIRST_VERSION : toVersionNumber(latest + 1);
    const version: IScenarioVersion = { name, number, scenario };
    const shelved: IShelvedVersion = { version, contentKey, users: ImmutableSet() };
    const stored: IStoredScenario = { name, latest: number, isDeleted: false };
    return { entry: { scenario: stored, versions: entry.versions.push(shelved) }, version };
}

/** The entry with one version's users changed, which must be kept. */
function withUsers(
    entry: IShelfEntry,
    number: VersionNumber,
    change: (users: ImmutableSet<ScenarioUser>) => ImmutableSet<ScenarioUser>,
): IShelfEntry {
    const at = entry.versions.findIndex((kept) => kept.version.number === number);
    // A list gives its last item for -1, so a version not kept is caught here.
    const found = at < 0 ? undefined : entry.versions.get(at);
    const kept = required(found, `version ${number} of the scenario`);
    const users = change(kept.users);
    const versions = entry.versions.set(at, { ...kept, users });
    return { ...entry, versions };
}

/**
 * The entry without what is no longer kept: once a scenario is deleted, a version no saved run
 * uses goes, and with no version left, the name goes too, so a later one starts at 1.
 */
function pruned(entry: IShelfEntry): IShelfEntry {
    if (entry.scenario?.isDeleted !== true) {
        return entry;
    }
    const versions = entry.versions.filter((kept) => !kept.users.isEmpty());
    return versions.isEmpty() ? EMPTY_ENTRY : { ...entry, versions };
}

/** Notes that a saved run uses a version, which then stays while it does (FND-81). */
export const usedIn = (
    entry: IShelfEntry,
    number: VersionNumber,
    user: ScenarioUser,
): IShelfEntry => withUsers(entry, number, (users) => users.add(user));

/** Notes that a saved run no longer uses a version, which goes if nothing else keeps it. */
export function releasedIn(
    entry: IShelfEntry,
    number: VersionNumber,
    user: ScenarioUser,
): IShelfEntry {
    const released = withUsers(entry, number, (users) => users.delete(user));
    return pruned(released);
}

/**
 * Deletes a scenario: it is no longer listed, and its versions go, except those saved runs use,
 * which stay until none does (FND-81).
 */
export function deletedIn(entry: IShelfEntry): IShelfEntry {
    if (entry.scenario === null) {
        return entry;
    }
    const deleted = { ...entry, scenario: { ...entry.scenario, isDeleted: true } };
    return pruned(deleted);
}
