import type { JsonValue } from './json-value';

function isPlainObject(value: object): boolean {
    const prototype: unknown = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

/** Whether a value is plain data that survives being stored as JSON unchanged. */
export function isJsonData(value: unknown): value is JsonValue {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
        return value.every(isJsonData);
    }
    if (typeof value === 'object' && isPlainObject(value)) {
        return Object.values(value).every(isJsonData);
    }
    return false;
}
