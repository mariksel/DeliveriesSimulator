/** What an input to a run asks for: the commands a restaurant or a driver can give. */
export const InputCommand = {
    CreateOrder: 'create-order',
    RequestDelivery: 'request-delivery',
    MarkReady: 'mark-ready',
    Accept: 'accept',
    PickUp: 'pick-up',
    Deliver: 'deliver',
} as const;

/** One of the values of {@link InputCommand}. */
export type InputCommand = (typeof InputCommand)[keyof typeof InputCommand];
