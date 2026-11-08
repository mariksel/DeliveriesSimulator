import { numberPart } from '../system/digests/digest-parts';
import { Duration } from '../system/time/duration';
import type { IInstant } from '../system/time/instant';

/**
 * A moment in simulated time: milliseconds since the run began. It is the Simulation engine's
 * implementation of the business's abstract time, so the business never knows it is simulated
 * (FND-83).
 */
export class SimTime implements IInstant {
    /** The start of every run. */
    static readonly runStart = new SimTime(Duration.none);

    /** A moment in simulated time, which must be a finite number of milliseconds from 0. */
    static ofMilliseconds(milliseconds: number): SimTime {
        if (milliseconds === 0) {
            return SimTime.runStart;
        }
        const sinceStart = Duration.ofMilliseconds(milliseconds);
        return new SimTime(sinceStart);
    }

    /**
     * The simulated time a moment the business handled is. Every moment in a run is one, since
     * the engine makes them all; anything else is a bug.
     */
    static from(instant: IInstant): SimTime {
        if (!(instant instanceof SimTime)) {
            throw new TypeError('A moment in a run must be a simulated time.');
        }
        return instant;
    }

    declare private readonly brand: never;

    /** Milliseconds since the run began. */
    get milliseconds(): number {
        return this.sinceStart.milliseconds;
    }

    private constructor(readonly sinceStart: Duration) {
        Object.freeze(this);
    }

    isBefore(other: IInstant): boolean {
        return this.milliseconds < other.sinceStart.milliseconds;
    }

    isAfter(other: IInstant): boolean {
        return this.milliseconds > other.sinceStart.milliseconds;
    }

    equals(other: IInstant): boolean {
        return this.milliseconds === other.sinceStart.milliseconds;
    }

    plus(duration: Duration): SimTime {
        const later = this.milliseconds + duration.milliseconds;
        return SimTime.ofMilliseconds(later);
    }

    minus(duration: Duration): SimTime {
        const earlier = Math.max(0, this.milliseconds - duration.milliseconds);
        return SimTime.ofMilliseconds(earlier);
    }

    since(earlier: IInstant): Duration {
        const age = Math.max(0, this.milliseconds - earlier.sinceStart.milliseconds);
        return Duration.ofMilliseconds(age);
    }

    digestPart(): string {
        return numberPart(this.milliseconds);
    }
}

/** A moment in simulated time, which must be a finite number of milliseconds from 0. */
export const toSimTime = (milliseconds: number): SimTime => SimTime.ofMilliseconds(milliseconds);

/** The start of every run. */
export const RUN_START = SimTime.runStart;
