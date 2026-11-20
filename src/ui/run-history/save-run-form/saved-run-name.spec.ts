import { describe, expect, it } from 'vitest';

import { toCalendarTime } from '../../../domain/simulation-engine/numbers';
import { savedRunName } from './saved-run-name';

describe('the name a saved run is offered', () => {
    it('is the name of the scenario and the date and time, in the local time zone', () => {
        const local = new Date(2026, 10, 9, 7, 5);
        const time = local.getTime();
        const at = toCalendarTime(time);

        const name = savedRunName('One order', at);

        expect(name).toBe('One order, 2026-11-09 07:05');
    });
});
