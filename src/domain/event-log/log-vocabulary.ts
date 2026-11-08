/** The modules that write to a run's log. */
export const LogSource = {
    Orders: 'orders',
    Deliveries: 'deliveries',
    Actors: 'actors',
    SimulationEngine: 'simulation-engine',
} as const;

/** One of the values of {@link LogSource}. */
export type LogSource = (typeof LogSource)[keyof typeof LogSource];

/** The kinds of entry that are not a module's own events. */
export const TechnicalLogKind = {
    OrderCreated: 'OrderCreated',
    OutboxEventWritten: 'OutboxEventWritten',
    InboxEventRead: 'InboxEventRead',
    NotificationSent: 'NotificationSent',
    CommandIssued: 'CommandIssued',
    CommandRefused: 'CommandRefused',
    ConfigChanged: 'ConfigChanged',
    IndirectEffectHappened: 'IndirectEffectHappened',
} as const;

/** One of the values of {@link TechnicalLogKind}. */
export type TechnicalLogKind = (typeof TechnicalLogKind)[keyof typeof TechnicalLogKind];
