import { WallClock } from '../../application-core/simulation-engine/wall-clock';
import type { WallTime } from '../../domain/simulation-engine/numbers';
import { toWallTime } from '../../domain/simulation-engine/numbers';

/** The wall clock, from the browser's monotonic clock. */
export class BrowserWallClock extends WallClock {
    now(): WallTime {
        const now = performance.now();
        return toWallTime(now);
    }
}
