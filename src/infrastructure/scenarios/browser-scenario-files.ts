import type { IChosenFile } from '../../application-core/scenarios/scenario-files';
import { ScenarioFiles } from '../../application-core/scenarios/scenario-files';
import type { ScenarioResult } from '../../application-core/scenarios/scenario';
import { refusedScenario } from '../../application-core/scenarios/scenario';
import { parseScenarioText } from './parse-scenario';

const UNREADABLE = 'the file could not be read';

/** Reads a scenario file chosen in the browser. */
export class BrowserScenarioFiles extends ScenarioFiles {
    async readScenario(file: IChosenFile): Promise<ScenarioResult> {
        const text = await textOf(file);
        return text === null ? refusedScenario(UNREADABLE) : parseScenarioText(text);
    }
}

/** The file's text, or null when it cannot be read. */
async function textOf(file: IChosenFile): Promise<string | null> {
    if (!(file instanceof Blob)) {
        return null;
    }
    try {
        return await file.text();
    } catch {
        return null;
    }
}
