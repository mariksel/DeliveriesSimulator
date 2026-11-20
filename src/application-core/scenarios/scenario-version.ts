import type { VersionNumber } from '../../domain/system/records/version-chain';
import type { IScenario } from './scenario';

/** A scenario as stored: the unchanging part, identified by its name (FND-81). */
export interface IStoredScenario {
    readonly name: string;
    /** The number its latest version took, which a new version carries on from. */
    readonly latest: VersionNumber;
    /**
     * Whether someone deleted it: it is no longer listed, but the versions saved runs use stay,
     * and storing its name again carries its numbering on.
     */
    readonly isDeleted: boolean;
}

/** Which version of which scenario: its name, and its number, from 1. */
export interface IScenarioVersionRef {
    readonly name: string;
    readonly number: VersionNumber;
}

/** One version of a scenario: its whole content, every field, numbered from 1 per name. */
export interface IScenarioVersion extends IScenarioVersionRef {
    readonly scenario: IScenario;
}

/** Who uses a version: a saved run, by its own ID, which Run history gives it. */
export type ScenarioUser = string & { readonly brand: 'ScenarioUser' };
/** Makes a {@link ScenarioUser} from a string. */
export const toScenarioUser = (value: string): ScenarioUser => value as ScenarioUser;

/**
 * What tells two scenarios' content apart: the same key for the same content, every field, in
 * the form the app writes it, whatever the file's spacing or order. Infrastructure works it
 * out; the core only compares keys.
 */
export type ScenarioContentKey = string & { readonly brand: 'ScenarioContentKey' };
/** Makes a {@link ScenarioContentKey} from a string. */
export const toScenarioContentKey = (value: string): ScenarioContentKey =>
    value as ScenarioContentKey;
