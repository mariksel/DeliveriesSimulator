import { refuse } from '../system/validation/refuse';

/**
 * Map and routing's branded numbers, each made only by a creator that checks it (FND-83).
 */

/** A distance, in metres. A tuned limit may go below 0, to test extremes. */
export type Metres = number & { readonly brand: 'Metres' };
/** An angle, such as a latitude or a longitude, in degrees. */
export type Degrees = number & { readonly brand: 'Degrees' };

/** A distance, which must be a finite number. */
export function toMetres(value: number): Metres {
    if (!Number.isFinite(value)) {
        return refuse('A distance', value, 'a finite number');
    }
    return value as Metres;
}

/** An angle, which must be a finite number. */
export function toDegrees(value: number): Degrees {
    if (!Number.isFinite(value)) {
        return refuse('An angle', value, 'a finite number');
    }
    return value as Degrees;
}
