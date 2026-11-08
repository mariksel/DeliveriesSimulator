import { describe, expect, it } from 'vitest';

import { required } from './required';

describe('required', () => {
    it.each([0, '', false, 'value'])('returns %j, which exists', (value) => {
        const secondValue = required(value, 'it');
        expect(secondValue).toBe(value);
    });

    it.each([null, undefined])('throws on %s, saying what is missing', (value) => {
        expect(() => required(value, 'the driver')).toThrow('Missing the driver.');
    });
});
