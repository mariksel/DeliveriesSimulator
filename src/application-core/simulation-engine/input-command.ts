/** What an input to a run asks for: the commands a restaurant or a driver can give. */
export const InputCommand = {
    CreateOrder: 'create-order',
    RequestDelivery: 'request-delivery',
    MarkReady: 'mark-ready',
    Accept: 'accept',
    PickUp: 'pick-up',
    Deliver: 'deliver',
    /**
     * A driver's app sending its location, by itself, every interval; never a step. Runs made
     * before sends were batched hold it (FND-90).
     */
    SendLocation: 'send-location',
    /** Every app due at one moment sending its location, as one call; never a step (FND-90). */
    SendLocations: 'send-locations',
} as const;

/** One of the values of {@link InputCommand}. */
export type InputCommand = (typeof InputCommand)[keyof typeof InputCommand];

/** A command about an order, which a scenario's step gives. */
export type OrderCommand = Exclude<
    InputCommand,
    typeof InputCommand.SendLocation | typeof InputCommand.SendLocations
>;
