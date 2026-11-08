import { numberPart } from '../digests/digest-parts';
import { Duration } from './duration';
import type { IInstant } from './instant';

/**
 * A moment for the business modules' tests, which may not use the Simulation engine's simulated
 * time. It counts milliseconds from the start of its timeline, as a simulated time does.
 */
class TestInstant implements IInstant {
    declare private readonly brand: never;

    constructor(readonly sinceStart: Duration) {
        Object.freeze(this);
    }

    isBefore(other: IInstant): boolean {
        return other.sinceStart.isLongerThan(this.sinceStart);
    }

    isAfter(other: IInstant): boolean {
        return this.sinceStart.isLongerThan(other.sinceStart);
    }

    equals(other: IInstant): boolean {
        return this.sinceStart.equals(other.sinceStart);
    }

    plus(duration: Duration): IInstant {
        const later = this.sinceStart.plus(duration);
        return new TestInstant(later);
    }

    minus(duration: Duration): IInstant {
        const earlier = Math.max(0, this.sinceStart.milliseconds - duration.milliseconds);
        const sinceStart = Duration.ofMilliseconds(earlier);
        return new TestInstant(sinceStart);
    }

    since(earlier: IInstant): Duration {
        const age = Math.max(0, this.sinceStart.milliseconds - earlier.sinceStart.milliseconds);
        return Duration.ofMilliseconds(age);
    }

    digestPart(): string {
        return numberPart(this.sinceStart.milliseconds);
    }
}

/** A moment this many milliseconds after the start of the tests' timeline. */
export function instantAt(milliseconds: number): IInstant {
    const sinceStart = Duration.ofMilliseconds(milliseconds);
    return new TestInstant(sinceStart);
}
