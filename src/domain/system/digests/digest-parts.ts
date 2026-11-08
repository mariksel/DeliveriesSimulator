/**
 * How a record is written out for a digest, and the check typed equality is built from. Each
 * written record can be read back only one way: text carries its length, a null has its own mark,
 * and a record is braced.
 */

/** A null, written out. */
export const NULL_PART = '_';

/**
 * One field of a record, by its type. A record's encoder lists its fields as these, in a fixed
 * order, so no field is written out by a nested call.
 */
export type DigestField =
    | { readonly text: string }
    | { readonly number: number }
    | { readonly isTrue: boolean }
    | { readonly textOrNull: string | null }
    | { readonly numberOrNull: number | null }
    /** A record written out already, such as a record held inside this one. */
    | { readonly part: string };

/** Text, written out with its length, so no text can run into the part after it. */
export const textPart = (text: string): string => `${text.length}:${text}`;

/** A number, written out. */
export const numberPart = (value: number): string => `n${value}`;

function fieldPart(field: DigestField): string {
    if ('text' in field) {
        return textPart(field.text);
    }
    if ('number' in field) {
        return numberPart(field.number);
    }
    if ('isTrue' in field) {
        return field.isTrue ? 't' : 'f';
    }
    if ('textOrNull' in field) {
        return field.textOrNull === null ? NULL_PART : textPart(field.textOrNull);
    }
    if ('numberOrNull' in field) {
        return field.numberOrNull === null ? NULL_PART : numberPart(field.numberOrNull);
    }
    return field.part;
}

/** A record's fields, written out in the order given. */
export function recordPart(fields: readonly DigestField[]): string {
    const parts = fields.map(fieldPart);
    return `{${parts.join(',')}}`;
}

/** Whether every check holds. It keeps typed equality free of long chains of conditions. */
export const allTrue = (...checks: readonly boolean[]): boolean => checks.every(Boolean);
