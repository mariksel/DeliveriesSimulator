import { List } from 'immutable';

import type { BuiltInScenarioId } from './built-in-scenarios';

import type { IBuiltInScenario } from './built-in-scenarios';
import { BuiltInScenarios } from './built-in-scenarios';
import { ONE_ORDER_SCENARIO } from './one-order.testing';
import type { ScenarioResult } from './scenario';
import { refusedScenario } from './scenario';
import type { IChosenFile } from './scenario-files';
import { ScenarioFiles } from './scenario-files';
import { toBuiltInScenarioId } from './built-in-scenarios';

/** The ID the one-order scenario has in the stand-in built-in library. */
export const ONE_ORDER_ID = toBuiltInScenarioId('one-order');

/** The name of a chosen file that holds the one-order scenario, for {@link FilesForTest}. */
export const ONE_ORDER_FILE = 'one-order.json';

/** The name of a chosen file that is not valid JSON, for {@link FilesForTest}. */
export const INVALID_FILE = 'invalid.json';

/** What a file that is not valid JSON reads as. */
export const NOT_JSON = 'the file is not valid JSON';

const READ_AS = new Map<string, ScenarioResult>([
    [ONE_ORDER_FILE, { isOk: true, scenario: ONE_ORDER_SCENARIO }],
    [INVALID_FILE, refusedScenario(NOT_JSON)],
]);

/**
 * Stands in for reading chosen files. A file reads as its name says, and a file with any other
 * name cannot be read.
 */
export class FilesForTest extends ScenarioFiles {
    readScenario(file: IChosenFile): Promise<ScenarioResult> {
        const result = READ_AS.get(file.name) ?? refusedScenario('the file could not be read');
        return Promise.resolve(result);
    }
}

/** Stands in for the built-in library, which holds the one-order scenario alone. */
export class BuiltInsForTest extends BuiltInScenarios {
    list(): List<IBuiltInScenario> {
        return List.of({ id: ONE_ORDER_ID, name: ONE_ORDER_SCENARIO.name });
    }

    scenario(id: BuiltInScenarioId): ScenarioResult {
        return id === ONE_ORDER_ID
            ? { isOk: true, scenario: ONE_ORDER_SCENARIO }
            : refusedScenario(`there is no built-in scenario "${id}"`);
    }
}
