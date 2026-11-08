import { List } from 'immutable';

import { statedParameter, statedRule } from '../business-rules/as-stated';
import { ParameterKind } from '../business-rules/parameter-kind';
import { RuleKind } from '../business-rules/rule-kind';
import { UsableValues } from '../business-rules/usable-values';

/**
 * Orders' rules of V1.0.0, written with the Business rules abstractions (FND-84): its
 * communication values, and the allowed transitions of the order lifecycle built so far. The
 * values are as the V1.0.0 pages state them, and the user accepted the ranges on 2026-11-07.
 */

const COMMUNICATION = 'V1.0.0 module communication';
const LIFECYCLE = 'V1.0.0 lifecycle: Transitions';

/** How often orders reads its inbox. */
export const ORDERS_INBOX_INTERVAL = statedParameter({
    id: 'interval',
    name: 'Orders inbox interval',
    text: 'How long after one read of the deliveries outbox the next runs.',
    kind: ParameterKind.Duration,
    usable: UsableValues.WholeAboveZero,
    defaultValue: 5000,
    lowest: 1000,
    highest: 60_000,
});

/** How far back orders' inbox starts reading. */
export const ORDERS_READ_LAG = statedParameter({
    id: 'read-lag',
    name: 'Orders read lag',
    text: 'The inbox starts reading this long before the latest event it has read.',
    kind: ParameterKind.Duration,
    defaultValue: 60_000,
    lowest: 0,
    highest: 300_000,
});

/** How often pending handoffs are retried. */
export const HANDOFF_RETRY_INTERVAL = statedParameter({
    id: 'interval',
    name: 'Handoff retry interval',
    text: 'How long after one retry of the pending handoffs the next runs.',
    kind: ParameterKind.Duration,
    usable: UsableValues.WholeAboveZero,
    defaultValue: 5000,
    lowest: 1000,
    highest: 60_000,
});

/** How many handoffs one retry run sends. */
export const MAX_HANDOFF_RETRIES = statedParameter({
    id: 'max-retries',
    name: 'Handoff retries per run',
    text: 'At most this many pending handoffs are retried in one run of the job.',
    kind: ParameterKind.Count,
    defaultValue: 100,
    lowest: 1,
    highest: 1000,
});

/** When orders next reads its inbox. */
export const ORDERS_INBOX = statedRule({
    id: 'orders.inbox',
    name: 'Orders inbox',
    text: 'Orders reads the deliveries outbox at a fixed interval.',
    source: `${COMMUNICATION}: Inboxes`,
    kind: RuleKind.Calculation,
    parameters: [ORDERS_INBOX_INTERVAL],
});

/** Which events orders' inbox still reads. */
export const ORDERS_INBOX_READ_LAG = statedRule({
    id: 'orders.inbox-read-lag',
    name: 'Orders inbox read lag',
    text: 'An event older than the read lag before the latest event read is not read.',
    source: `${COMMUNICATION}: Inboxes`,
    kind: RuleKind.Limit,
    parameters: [ORDERS_READ_LAG],
});

/** When the pending handoffs are next retried. */
export const HANDOFF_RETRY = statedRule({
    id: 'orders.handoff-retry',
    name: 'Handoff retry',
    text: 'A job retries every pending delivery request handoff at a fixed interval.',
    source: `${COMMUNICATION}: Handoff`,
    kind: RuleKind.Calculation,
    parameters: [HANDOFF_RETRY_INTERVAL],
});

/** How many handoffs one retry run may send. */
export const HANDOFF_RETRIES_PER_RUN = statedRule({
    id: 'orders.handoff-retries-per-run',
    name: 'Handoff retries per run',
    text: 'One run of the retry job retries a limited number of pending handoffs.',
    source: `${COMMUNICATION}: Handoff`,
    kind: RuleKind.Limit,
    parameters: [MAX_HANDOFF_RETRIES],
});

/** A delivery is requested only for a Created order. */
export const REQUEST_DELIVERY = statedRule({
    id: 'orders.request-delivery',
    name: 'Request a delivery',
    text: 'A delivery may be requested for an order that is Created.',
    source: LIFECYCLE,
    kind: RuleKind.Check,
    parameters: [],
});

/** An order is marked ready only before it is picked up. */
export const MARK_READY = statedRule({
    id: 'orders.mark-ready',
    name: 'Mark ready',
    text: 'An order may be marked ready while it is Created, DeliveryRequested, or DriverAssigned.',
    source: LIFECYCLE,
    kind: RuleKind.Check,
    parameters: [],
});

/** A delivery request is accepted only while it is requested. */
export const ACCEPT_DELIVERY_REQUEST = statedRule({
    id: 'orders.accept-delivery-request',
    name: 'Accept a delivery request',
    text: 'A delivery request may be accepted while the order is DeliveryRequested.',
    source: LIFECYCLE,
    kind: RuleKind.Check,
    parameters: [],
});

/** An order is picked up only once a driver is assigned. */
export const PICK_UP = statedRule({
    id: 'orders.pick-up',
    name: 'Pick up',
    text: 'An order may be picked up while it is DriverAssigned.',
    source: LIFECYCLE,
    kind: RuleKind.Check,
    parameters: [],
});

/** An order is delivered only once picked up. */
export const DELIVER = statedRule({
    id: 'orders.deliver',
    name: 'Deliver',
    text: 'An order may be delivered while it is PickedUp.',
    source: LIFECYCLE,
    kind: RuleKind.Check,
    parameters: [],
});

/** Orders' rules, in the order the Rules panel lists them. */
export const ORDERS_RULE_LIST = List([
    ORDERS_INBOX,
    ORDERS_INBOX_READ_LAG,
    HANDOFF_RETRY,
    HANDOFF_RETRIES_PER_RUN,
    REQUEST_DELIVERY,
    MARK_READY,
    ACCEPT_DELIVERY_REQUEST,
    PICK_UP,
    DELIVER,
]);
