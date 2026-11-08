import type { ScenarioResult } from '../../application-core/scenarios/scenario';
import { refusedScenario } from '../../application-core/scenarios/scenario';
import { readScenario } from './read-scenario';

/** Parses a scenario file's text, and reads the scenario it holds. */
export function parseScenarioText(text: string): ScenarioResult {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return refusedScenario('the file is not valid JSON');
    }
    return readScenario(value);
}
