/**
 * Marks what the compiler has proved cannot happen. Reaching it anyway is a bug, so it throws
 * (FND-22).
 */
export function unreachable(value: never): never {
    throw new Error(`Unreachable: ${String(value)}.`);
}
