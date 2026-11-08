import { List, OrderedMap, Set as ImmutableSet } from 'immutable';

import { LogSource } from '../event-log/log-vocabulary';
import type { IViolation } from './criterion';
import { Criterion } from './criterion';
import type { ILoggedEvent, ILoggedOutboxEvent, IRunRecord } from './run-record';
import type { OrderId } from '../orders/order';
import type { LogSequence } from '../event-log/numbers';

const violation = (sequence: LogSequence | null, message: string): IViolation => ({
    criterion: Criterion.ModulesAgree,
    sequence,
    message,
});

function eventsOfOrder(
    events: List<ILoggedEvent>,
    source: string,
): OrderedMap<string, List<ILoggedEvent>> {
    const groupBy = events
        .filter((event) => event.source === source)
        .groupBy((event) => event.orderId);
    return OrderedMap(groupBy);
}

const lastDriver = (events: List<ILoggedEvent> | undefined): string | null =>
    events?.findLast((event) => event.driverId !== null)?.driverId ?? null;

function unsettled(run: IRunRecord): List<IViolation> {
    const reads = run.reads.map((entry) => `${entry.source}|${entry.outboxEventId}`);
    const read = ImmutableSet(reads);
    const isRead = (event: ILoggedOutboxEvent): boolean => {
        const reader = event.source === LogSource.Orders ? LogSource.Deliveries : LogSource.Orders;
        return read.has(`${reader}|${event.id}`);
    };
    return run.outbox
        .filter((event) => !isRead(event))
        .map((event) =>
            violation(event.sequence, `Events are still flowing: ${event.id} has not been read.`),
        );
}

function differentKinds(
    orderId: string,
    inOrders: List<ILoggedEvent> | undefined,
    inDeliveries: List<ILoggedEvent> | undefined,
): List<IViolation> {
    const kindsOf = (events: List<ILoggedEvent> | undefined): ImmutableSet<string> => {
        const secondEvents = events?.map((event) => event.kind);
        return ImmutableSet(secondEvents);
    };
    const sequence = (inOrders ?? inDeliveries)?.last()?.sequence ?? null;
    const missing = (
        kinds: ImmutableSet<string>,
        other: ImmutableSet<string>,
        module: string,
    ): List<IViolation> =>
        kinds
            .subtract(other)
            .toList()
            .sort()
            .map((kind) =>
                violation(sequence, `Order ${orderId}: ${module} has no ${kind} event.`),
            );
    const orderKinds = kindsOf(inOrders);
    const deliveryKinds = kindsOf(inDeliveries);
    const valuesOrCollections = missing(deliveryKinds, orderKinds, 'orders');
    return missing(orderKinds, deliveryKinds, 'deliveries').concat(valuesOrCollections);
}

function differentDrivers(
    orderId: string,
    inOrders: List<ILoggedEvent> | undefined,
    inDeliveries: List<ILoggedEvent> | undefined,
): List<IViolation> {
    const inOrdersDriver = lastDriver(inOrders);
    const inDeliveriesDriver = lastDriver(inDeliveries);
    if (inOrdersDriver === inDeliveriesDriver) {
        return List();
    }
    const secondViolation = violation(
        (inDeliveries ?? inOrders)?.last()?.sequence ?? null,
        `Order ${orderId}: orders has driver ${inOrdersDriver}, deliveries has ${inDeliveriesDriver}.`,
    );
    return List.of(secondViolation);
}

/**
 * Deliveries' copy of an order holds the status of the newest version it has read from the orders
 * outbox.
 */
function staleCopies(run: IRunRecord): List<IViolation> {
    const readIds = run.reads
        .filter((entry) => entry.source === LogSource.Deliveries)
        .map((entry) => entry.outboxEventId);
    const readByDeliveries = ImmutableSet(readIds);
    const noneYet = OrderedMap<OrderId, ILoggedOutboxEvent>();
    const newestRead = run.outbox
        .filter((event) => event.source === LogSource.Orders && readByDeliveries.has(event.id))
        .reduce((newest, event) => {
            const current = newest.get(event.orderId);
            return current === undefined || (event.orderVersion ?? 0) > (current.orderVersion ?? 0)
                ? newest.set(event.orderId, event)
                : newest;
        }, noneYet);
    return newestRead
        .entrySeq()
        .filter(([orderId, event]) => run.statuses.get(orderId)?.status !== event.orderStatus)
        .map(([orderId, event]) =>
            violation(
                event.sequence,
                `Order ${orderId}: orders has it as ${run.statuses.get(orderId)?.status ?? 'unknown'}, ` +
                    `and deliveries' copy as ${event.orderStatus ?? 'unknown'}.`,
            ),
        )
        .toList();
}

/**
 * FND-30: once events stop flowing, the two modules agree on every order's state (FND-49, Settled
 * at the end).
 */
export function modulesAgree(run: IRunRecord): List<IViolation> {
    const orders = eventsOfOrder(run.events, LogSource.Orders);
    const deliveries = eventsOfOrder(run.events, LogSource.Deliveries);
    const valuesOrCollections = deliveries.keySeq();
    const perOrder = orders
        .keySeq()
        .concat(valuesOrCollections)
        .toSet()
        .toList()
        .sort()
        .flatMap((orderId) => {
            const inOrders = orders.get(orderId);
            const inDeliveries = deliveries.get(orderId);
            const order = orders.get(orderId);
            const delivery = deliveries.get(orderId);
            const violations = differentDrivers(orderId, order, delivery);
            return differentKinds(orderId, inOrders, inDeliveries).concat(violations);
        });
    const violations = staleCopies(run);
    return unsettled(run).concat(perOrder, violations);
}
