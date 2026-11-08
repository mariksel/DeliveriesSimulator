/** Returns a value that must exist. A missing one is a bug, so it throws (FND-22). */
export function required<T>(value: T | null | undefined, what: string): T {
    if (value === null || value === undefined) {
        throw new Error(`Missing ${what}.`);
    }
    return value;
}
