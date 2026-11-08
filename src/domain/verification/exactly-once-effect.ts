import type { List } from 'immutable';

import { LogSource } from '../event-log/log-vocabulary';
import type { IViolation } from './criterion';
import { Criterion } from './criterion';
import type { ILoggedInboxRead, IRunRecord } from './run-record';
import type { LogSequence } from '../event-log/numbers';

const violation = (sequence: LogSequence | null, message: string): IViolation => ({
    criterion: Criterion.ExactlyOnceEffect,
    sequence,
    message,
});

const readerOf = (source: string): string =>
    source === LogSource.Orders ? LogSource.Deliveries : LogSource.Orders;

/** Each outbox event is read once by the other module: not lost, and not taken twice. */
function readsOfEachOutboxEvent(run: IRunRecord): List<IViolation> {
    const reads = run.reads.groupBy((read) => `${read.source}|${read.outboxEventId}`);
    return run.outbox.flatMap((event) => {
        const seen = reads.get(`${readerOf(event.source)}|${event.id}`)?.toList();
        if (seen === undefined) {
            return [
                violation(event.sequence, `${event.id} was lost: the other module never read it.`),
            ];
        }
        return seen
            .skip(1)
            .map((read) => violation(read.sequence, `${event.id} was read more than once.`));
    });
}

/** A read must be of an event the other module really wrote. */
function readsOfNothing(run: IRunRecord): List<IViolation> {
    const written = run.outbox.map((event) => `${readerOf(event.source)}|${event.id}`).toSet();
    return run.reads
        .filter((read: ILoggedInboxRead) => !written.has(`${read.source}|${read.outboxEventId}`))
        .map((read) =>
            violation(read.sequence, `${read.outboxEventId} was read, but never written.`),
        );
}

/** An event in one module takes effect in the other once: only one event there matches it. */
function eventsTakingEffectTwice(run: IRunRecord): List<IViolation> {
    const matches = run.events.filter((event) => event.matchingEventId !== null);
    return matches
        .groupBy((event) => `${event.source}|${event.matchingEventId ?? ''}`)
        .valueSeq()
        .flatMap((same) => same.toList().skip(1))
        .map((event) =>
            violation(
                event.sequence,
                `${event.matchingEventId ?? ''} took effect more than once in ${event.source}.`,
            ),
        )
        .toList();
}

/** An event's identity is unique in its module. */
function repeatedEvents(run: IRunRecord): List<IViolation> {
    return run.events
        .groupBy((event) => `${event.source}|${event.id}`)
        .valueSeq()
        .flatMap((same) => same.toList().skip(1))
        .map((event) =>
            violation(
                event.sequence,
                `${event.id} was recorded more than once in ${event.source}.`,
            ),
        )
        .toList();
}

/**
 * FND-30: no event is lost, and none takes effect twice, even when it is delivered more than once.
 */
export function exactlyOnceEffect(run: IRunRecord): List<IViolation> {
    const valuesOrCollections = readsOfNothing(run);
    const violations = eventsTakingEffectTwice(run);
    const secondViolations = repeatedEvents(run);
    return readsOfEachOutboxEvent(run).concat(valuesOrCollections, violations, secondViolations);
}
