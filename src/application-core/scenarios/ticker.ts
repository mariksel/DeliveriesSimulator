/**
 * Calls back regularly while a run is being watched. The browser's frames are outside the core.
 */
export abstract class Ticker {
    /** Starts calling back, replacing any earlier callback. */
    abstract start(onTick: () => void): void;
    /** Stops calling back. Stopping when already stopped does nothing. */
    abstract stop(): void;
}
