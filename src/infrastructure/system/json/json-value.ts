/** A value that survives being stored as JSON unchanged. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | IJsonObject;

/** An object whose fields are all JSON values. */
export interface IJsonObject {
    readonly [key: string]: JsonValue;
}
