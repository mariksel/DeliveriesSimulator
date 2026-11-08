import { Calculation } from '../business-rules/calculation';
import { Limit } from '../business-rules/limit';
import type { InboxPosition } from '../system/messaging/inbox-position';
import type { IInstant } from '../system/time/instant';
import type { Count } from '../system/math/math';
import {
    HANDOFF_RETRIES_PER_RUN,
    HANDOFF_RETRY,
    ORDERS_INBOX,
    ORDERS_INBOX_READ_LAG,
} from './orders-rule-definitions';
import type { OrdersRules } from './orders-rules';

/** An event in the deliveries outbox, and how far orders' inbox has read. */
interface IInboxEvent {
    readonly position: InboxPosition;
    readonly at: IInstant;
}

const NEXT_INBOX_READ = Calculation.create({
    rule: ORDERS_INBOX,
    calculates: (latest: IInstant, rules: OrdersRules): IInstant => latest.plus(rules.inboxJobMs),
});

const READ_LAG = Limit.create({
    rule: ORDERS_INBOX_READ_LAG,
    allows: (event: IInboxEvent, rules: OrdersRules) =>
        !event.position.isTooOldToRead(event.at, rules.readLagMs),
});

const NEXT_HANDOFF_RETRY = Calculation.create({
    rule: HANDOFF_RETRY,
    calculates: (latest: IInstant, rules: OrdersRules): IInstant =>
        latest.plus(rules.handoffRetryJobMs),
});

const RETRIES_PER_RUN = Limit.create({
    rule: HANDOFF_RETRIES_PER_RUN,
    allows: (retried: Count, rules: OrdersRules) => retried < rules.handoffRetriesPerRun,
});

/** When orders next reads its inbox, after its latest read. */
export const nextOrdersInboxAt = (latest: IInstant, rules: OrdersRules): IInstant =>
    NEXT_INBOX_READ.valueFor(latest, rules);

/** Whether orders' inbox still reads an event at this time, from where it has read to. */
export const isReadByOrders = (
    position: InboxPosition,
    at: IInstant,
    rules: OrdersRules,
): boolean => READ_LAG.isWithin({ position, at }, rules);

/** When the pending handoffs are next retried, after the latest retry. */
export const nextHandoffRetryAt = (latest: IInstant, rules: OrdersRules): IInstant =>
    NEXT_HANDOFF_RETRY.valueFor(latest, rules);

/** Whether one run of the retry job may retry another handoff, after this many. */
export const mayRetryAnother = (retried: Count, rules: OrdersRules): boolean =>
    RETRIES_PER_RUN.isWithin(retried, rules);
