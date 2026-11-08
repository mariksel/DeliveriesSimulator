import { List } from 'immutable';

import type { IBuiltInScenario } from '../../application-core/scenarios/built-in-scenarios';
import { BuiltInScenarios } from '../../application-core/scenarios/built-in-scenarios';
import type { ScenarioResult } from '../../application-core/scenarios/scenario';
import { refusedScenario } from '../../application-core/scenarios/scenario';
import ONE_ORDER from './built-in/one-order.json';
import { readScenario } from './read-scenario';
import type { BuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';
import { toBuiltInScenarioId } from '../../application-core/scenarios/built-in-scenarios';

/** A scenario file bundled with the simulator, under its ID. */
interface IBundledFile {
    readonly id: BuiltInScenarioId;
    readonly name: string;
    /** The file's contents, as the bundler parsed them. They are read like any other file's. */
    readonly contents: unknown;
}

/** The built-in library for V1.0.0. FND-49 lists what it grows into. */
const FILES: List<IBundledFile> = List.of({
    id: toBuiltInScenarioId('one-order'),
    name: ONE_ORDER.name,
    contents: ONE_ORDER,
});

/** The built-in scenarios, from the scenario files bundled with the simulator. */
export class BundledScenarios extends BuiltInScenarios {
    list(): List<IBuiltInScenario> {
        return FILES.map(({ id, name }) => ({ id, name }));
    }

    scenario(id: BuiltInScenarioId): ScenarioResult {
        const file = FILES.find((bundled) => bundled.id === id);
        return file === undefined
            ? refusedScenario(`there is no built-in scenario "${id}"`)
            : readScenario(file.contents);
    }
}
