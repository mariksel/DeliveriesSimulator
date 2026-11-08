/** One row of orders' event table. */
export type OrderEventId = string & { readonly brand: 'OrderEventId' };
/** Marks text as the ID of a row in orders' event table. */
export const toOrderEventId = (value: string): OrderEventId => value as OrderEventId;
