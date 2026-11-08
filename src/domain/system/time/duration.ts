import { numberPart } from '../digests/digest-parts';

const MS_PER_SECOND = 1000;

function assertLength(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
        throw new RangeError(
            `A duration must be a finite number of milliseconds from 0, not ${milliseconds}.`,
        );
    }
}

/**
 * A length of time, which the rules state as a fixed amount, such as 30 seconds. It never knows
 * whose time it measures (FND-83).
 */
export class Duration {
    /** No time at all. */
    static readonly none = new Duration(0);

    /** A length of time in milliseconds, which must be a finite number from 0. */
    static ofMilliseconds(milliseconds: number): Duration {
        assertLength(milliseconds);
        return milliseconds === 0 ? Duration.none : new Duration(milliseconds);
    }

    /** A length of time in seconds, which must be a finite number from 0. */
    static ofSeconds(seconds: number): Duration {
        const milliseconds = seconds * MS_PER_SECOND;
        return Duration.ofMilliseconds(milliseconds);
    }

    declare private readonly brand: never;

    /** Whether it is a whole number of milliseconds above 0, as a job's interval must be. */
    get isWholeAndAboveNone(): boolean {
        return Number.isInteger(this.milliseconds) && this.milliseconds > 0;
    }

    private constructor(
        /** How long it is, in milliseconds. */
        readonly milliseconds: number,
    ) {
        Object.freeze(this);
    }

    /** This length and another together. */
    plus(other: Duration): Duration {
        const total = this.milliseconds + other.milliseconds;
        return Duration.ofMilliseconds(total);
    }

    /** This length some number of times over. */
    times(factor: number): Duration {
        const scaled = this.milliseconds * factor;
        return Duration.ofMilliseconds(scaled);
    }

    /** Whether this is longer than another length. */
    isLongerThan(other: Duration): boolean {
        return this.milliseconds > other.milliseconds;
    }

    /** Whether this is shorter than another length. */
    isShorterThan(other: Duration): boolean {
        return this.milliseconds < other.milliseconds;
    }

    /** Whether another length is the same. */
    equals(other: Duration): boolean {
        return this.milliseconds === other.milliseconds;
    }

    /** The length, written out for a digest, as a number of milliseconds. */
    digestPart(): string {
        return numberPart(this.milliseconds);
    }
}

/** A length of time in milliseconds, which must be a finite number from 0. */
export const toDuration = (milliseconds: number): Duration =>
    Duration.ofMilliseconds(milliseconds);
