import { isCollection } from 'immutable';

/**
 * Freezes a value, however deep, for a test to pass in: code that tries to change its input then
 * fails loudly. Immutable.js collections cannot change anyway, and need their own fields free.
 */
export function deepFrozen<T>(value: T): T {
    if (isCollection(value)) {
        value.forEach((item: unknown) => deepFrozen(item));
        return value;
    }
    if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach((item: unknown) => deepFrozen(item));
        Object.freeze(value);
    }
    return value;
}
