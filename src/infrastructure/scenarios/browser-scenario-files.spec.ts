import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import type { ScenarioResult } from '../../application-core/scenarios/scenario';
import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import { BrowserScenarioFiles } from './browser-scenario-files';
import ONE_ORDER from './built-in/one-order.json';

const problemsOf = (result: ScenarioResult): string[] =>
    result.isOk ? [] : result.problems.map((problem) => problem.message).toArray();

describe('BrowserScenarioFiles', () => {
    it('gives the scenario a chosen file holds', async () => {
        const text = JSON.stringify(ONE_ORDER);
        const file = new File([text], 'scenario.json');

        const result = await new BrowserScenarioFiles().readScenario(file);

        expect(result).toEqual({ isOk: true, scenario: ONE_ORDER_SCENARIO, warnings: List() });
    });

    it("gives what is wrong with the file's scenario", async () => {
        const file = new File(['{ not json'], 'scenario.json');

        const result = await new BrowserScenarioFiles().readScenario(file);

        const problems = problemsOf(result);
        expect(problems).toEqual(['the file is not valid JSON']);
    });

    it('refuses something that is not a file', async () => {
        const result = await new BrowserScenarioFiles().readScenario({ name: 'not-a-file.json' });

        const problems = problemsOf(result);
        expect(problems).toEqual(['the file could not be read']);
    });

    it('refuses a file that cannot be read', async () => {
        const file = new File(['the text'], 'scenario.json');
        file.text = (): Promise<string> => {
            const reason = new Error('gone');
            return Promise.reject(reason);
        };

        const result = await new BrowserScenarioFiles().readScenario(file);

        const problems = problemsOf(result);
        expect(problems).toEqual(['the file could not be read']);
    });
});
