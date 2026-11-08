import { refuse } from '../system/validation/refuse';

/**
 * The driver rules' branded numbers, each made only by a creator that checks it (FND-83).
 */

/** A driver's ranking score: a higher one is ranked first. */
export type Score = number & { readonly brand: 'Score' };
/** A multiplier, such as a boost, a decay, or a clock speed. */
export type Factor = number & { readonly brand: 'Factor' };

/** A ranking score, which must be a finite number. */
export function toScore(value: number): Score {
    if (!Number.isFinite(value)) {
        return refuse('A score', value, 'a finite number');
    }
    return value as Score;
}

/** A multiplier, which must be a finite number. */
export function toFactor(value: number): Factor {
    if (!Number.isFinite(value)) {
        return refuse('A multiplier', value, 'a finite number');
    }
    return value as Factor;
}
