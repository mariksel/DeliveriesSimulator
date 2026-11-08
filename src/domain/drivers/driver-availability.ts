/** How available an online driver says they are. */
export const DriverAvailability = {
    Available: 'Available',
    Busy: 'Busy',
    FreeForDelivery: 'FreeForDelivery',
} as const;

/** One of the values of {@link DriverAvailability}. */
export type DriverAvailability = (typeof DriverAvailability)[keyof typeof DriverAvailability];
