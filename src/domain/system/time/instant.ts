import type { Duration } from './duration';

/**
 * A moment in time. The business works with moments only through this, so it never knows whose
 * clock they come from: a simulated time is one implementation (FND-83). Every moment lies on one
 * timeline, which starts at a moment nothing comes before.
 */
export interface IInstant {
    /** How long after the start of its timeline this moment is. Two moments compare by it. */
    readonly sinceStart: Duration;
    /** Whether this moment comes before another. */
    isBefore(other: IInstant): boolean;
    /** Whether this moment comes after another. */
    isAfter(other: IInstant): boolean;
    /** Whether another moment is the same. */
    equals(other: IInstant): boolean;
    /** The moment a length of time after this one. */
    plus(duration: Duration): IInstant;
    /** The moment a length of time before this one, or its timeline's start if that is later. */
    minus(duration: Duration): IInstant;
    /**
     * How long ago an earlier moment was, as of this one. A moment after this one, such as a
     * device time a little ahead of the clock, counts as just now.
     */
    since(earlier: IInstant): Duration;
    /** The moment, written out for a digest. */
    digestPart(): string;
}

/** The later of two moments; the first, when they are the same. */
export const laterOf = <TInstant extends IInstant>(first: TInstant, second: TInstant): TInstant =>
    second.isAfter(first) ? second : first;

/** The earlier of two moments; the first, when they are the same. */
export const earlierOf = <TInstant extends IInstant>(
    first: TInstant,
    second: TInstant,
): TInstant => (second.isBefore(first) ? second : first);

/** The order of two moments, for sorting: below 0 when the first comes first. */
export const byTime = (first: IInstant, second: IInstant): number =>
    first.sinceStart.milliseconds - second.sinceStart.milliseconds;

/**
 * The moment this many milliseconds after the start of a timeline. Whatever loads saved moments
 * is given one, so it need not know whose timeline it is.
 */
export type InstantAt = (milliseconds: number) => IInstant;
