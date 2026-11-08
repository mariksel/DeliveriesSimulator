/** What a module can ask the simulation engine to do for it. */
export const FollowUpKind = {
    SendHandoff: 'SendHandoff',
    CallOrders: 'CallOrders',
} as const;

/** One of the values of {@link FollowUpKind}. */
export type FollowUpKind = (typeof FollowUpKind)[keyof typeof FollowUpKind];
