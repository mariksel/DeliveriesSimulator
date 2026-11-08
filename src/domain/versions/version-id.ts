/** A version of the service's rules, such as V1.0.0. */
export type VersionId = string & { readonly brand: 'VersionId' };
/** Marks text as a version's ID. */
export const toVersionId = (value: string): VersionId => value as VersionId;
