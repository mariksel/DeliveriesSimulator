import type { IInstant } from './instant';

/**
 * Where the time comes from, should a business module ever need to read it rather than be given
 * it. Its implementation is not known to the business (FND-83).
 */
export interface IClock {
    /** The moment it is now. */
    now(): IInstant;
}
