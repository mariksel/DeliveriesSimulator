import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { ONE_ORDER_SCENARIO } from '../../application-core/scenarios/one-order.testing';
import ONE_ORDER from './built-in/one-order.json';
import { parseScenarioText } from './parse-scenario';

describe("parsing a scenario file's text", () => {
    it('gives the scenario the text holds', () => {
        const text = JSON.stringify(ONE_ORDER);

        const result = parseScenarioText(text);

        expect(result).toEqual({ isOk: true, scenario: ONE_ORDER_SCENARIO, warnings: List() });
    });

    it('refuses text that is not JSON, at the top of the file', () => {
        const result = parseScenarioText('{ not json');

        const problems = result.isOk ? [] : result.problems.toArray();
        expect(problems).toEqual([{ path: '', message: 'the file is not valid JSON' }]);
    });

    it('says what is wrong with JSON that is not a scenario', () => {
        const result = parseScenarioText('[]');

        const problems = result.isOk ? [] : result.problems.toArray();
        expect(problems).toEqual([
            { path: '', message: 'a scenario must be an object with fields' },
        ]);
    });
});
