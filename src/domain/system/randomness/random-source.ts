import type { Fraction } from '../math/math';

/**
 * Where random numbers come from, should a business module ever need one. Each purpose draws from
 * its own named stream. The business never knows how the numbers are made: a seeded random source
 * is one implementation (FND-83).
 */
export interface IRandomSource {
    /** A fraction drawn from a named stream, and the source as it stands after the draw. */
    nextFraction(stream: string): readonly [value: Fraction, source: IRandomSource];
}
