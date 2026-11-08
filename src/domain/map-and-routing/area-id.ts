/** A delivery area. */
export type AreaId = string & { readonly brand: 'AreaId' };
/** Marks text as an area's ID. */
export const toAreaId = (value: string): AreaId => value as AreaId;
