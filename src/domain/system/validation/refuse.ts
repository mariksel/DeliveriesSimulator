/** Refuses a number that breaks its rule, saying what it is and what the rule is. */
export function refuse(what: string, value: number, rule: string): never {
    throw new RangeError(`${what} must be ${rule}, not ${value}.`);
}
