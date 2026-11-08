import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { warningLines } from './scenario-warnings';

describe("a scenario's warnings", () => {
    it('show each with its place in the file', () => {
        const warnings = List([
            { path: 'rules[0].value', message: 'is outside its valid range, from 500 to 10000' },
        ]);

        const lines = warningLines(warnings);

        expect(lines).toEqual(['rules[0].value: is outside its valid range, from 500 to 10000']);
    });

    it('show nothing when there are none', () => {
        const none = List<{ readonly path: string; readonly message: string }>();

        const lines = warningLines(none);

        expect(lines).toEqual([]);
    });
});
