import type { WallTime } from '../../domain/simulation-engine/numbers';

/** Real elapsed time, for the mode that runs at wall-clock speed. */
export abstract class WallClock {
    /** Milliseconds since an arbitrary start. It never decreases. */
    abstract now(): WallTime;
}
