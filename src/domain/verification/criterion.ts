import type { LogSequence } from '../event-log/numbers';

/** The correctness criteria the checker can judge a run on so far. */
export const Criterion = {
    ValidFinalState: 'Valid final state',
    ModulesAgree: 'Modules agree',
    ExactlyOnceEffect: 'Exactly-once effect',
    OutboxForEveryEvent: 'Outbox for every event',
} as const;

/** One of the values of {@link Criterion}. */
export type Criterion = (typeof Criterion)[keyof typeof Criterion];

/** One way a run broke a criterion, linked to the log entry that shows it. */
export interface IViolation {
    readonly criterion: Criterion;
    /** The sequence number of the entry that shows it, or null when no entry does. */
    readonly sequence: LogSequence | null;
    readonly message: string;
}
