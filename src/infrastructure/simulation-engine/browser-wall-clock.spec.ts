import { expect, it } from 'vitest';

import { BrowserWallClock } from './browser-wall-clock';

it('never goes backwards', () => {
    const clock = new BrowserWallClock();

    const first = clock.now();
    const second = clock.now();

    expect(second).toBeGreaterThanOrEqual(first);
});
