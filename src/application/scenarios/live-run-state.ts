/** How a run being watched stands. */
export const LiveRunState = {
    /** Open at time 0, and not started. */
    Ready: 'Ready',
    Running: 'Running',
    Paused: 'Paused',
    /** At the time the scenario states it ends. */
    Ended: 'Ended',
    /** A bug stopped it. */
    Failed: 'Failed',
} as const;

/** One of the values of {@link LiveRunState}. */
export type LiveRunState = (typeof LiveRunState)[keyof typeof LiveRunState];
