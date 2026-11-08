import type { List } from 'immutable';

import { LogSource } from '../event-log/log-vocabulary';
import type { IViolation } from './criterion';
import { Criterion } from './criterion';
import type { ILoggedEvent, IRunRecord } from './run-record';
import type { LogSequence } from '../event-log/numbers';

const REQUEST_KIND = 'OrderDeliveryRequest';

const violation = (sequence: LogSequence | null, message: string): IViolation => ({
    criterion: Criterion.OutboxForEveryEvent,
    sequence,
    message,
});

/** A delivery request writes its outbox event only once deliveries acknowledges it. */
function awaitsAcknowledgement(event: ILoggedEvent, run: IRunRecord): boolean {
    return (
        event.source === LogSource.Orders &&
        event.kind === REQUEST_KIND &&
        !run.events.some(
            (other) => other.source === LogSource.Deliveries && other.matchingEventId === event.id,
        )
    );
}

/** FND-30: every event that takes effect writes exactly one outbox event in its own module. */
export function outboxForEveryEvent(run: IRunRecord): List<IViolation> {
    const written = run.outbox.groupBy((event) => `${event.source}|${event.eventId}`);
    const known = run.events.map((event) => `${event.source}|${event.id}`).toSet();
    const perEvent = run.events.flatMap((event) => {
        const outbox = written.get(`${event.source}|${event.id}`)?.toList();
        if (outbox === undefined) {
            return awaitsAcknowledgement(event, run)
                ? []
                : [
                      violation(
                          event.sequence,
                          `${event.id} wrote no outbox event in ${event.source}.`,
                      ),
                  ];
        }
        return outbox
            .skip(1)
            .map((extra) =>
                violation(
                    extra.sequence,
                    `${event.id} wrote more than one outbox event in ${event.source}.`,
                ),
            );
    });
    const orphans = run.outbox
        .filter((event) => !known.has(`${event.source}|${event.eventId}`))
        .map((event) =>
            violation(
                event.sequence,
                `${event.id} is for ${event.eventId}, which was never recorded.`,
            ),
        );
    return perEvent.concat(orphans);
}
