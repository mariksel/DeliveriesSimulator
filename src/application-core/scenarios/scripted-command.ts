/** What a restaurant or driver can do in a scenario. */
export const ScriptedCommand = {
    CreateOrder: 'create-order',
    RequestDelivery: 'request-delivery',
    MarkReady: 'mark-ready',
    Accept: 'accept',
    PickUp: 'pick-up',
    Deliver: 'deliver',
} as const;

/** One of the values of {@link ScriptedCommand}. */
export type ScriptedCommand = (typeof ScriptedCommand)[keyof typeof ScriptedCommand];
