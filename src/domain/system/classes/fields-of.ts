/**
 * The data fields of a Domain class, without its methods: what its `create` takes, so a class is
 * rebuilt from named values rather than a list of them in order.
 */
export type FieldsOf<TClass> = {
    readonly [
        TKey in keyof TClass as TClass[TKey] extends (...args: never) => unknown ? never : TKey
    ]: TClass[TKey];
};
