/** One row of deliveries' event table. */
export type DeliveryEventId = string & { readonly brand: 'DeliveryEventId' };
/** Marks text as the ID of a row in deliveries' event table. */
export const toDeliveryEventId = (value: string): DeliveryEventId => value as DeliveryEventId;
