import { Calculation } from '../../business-rules/calculation';
import { Limit } from '../../business-rules/limit';
import type { InboxPosition } from '../../system/messaging/inbox-position';
import type { IInstant } from '../../system/time/instant';
import { DELIVERIES_INBOX, DELIVERIES_INBOX_READ_LAG } from './deliveries-rule-definitions';
import type { DeliveriesRules } from './deliveries-rules';

/** An event in the orders outbox, and how far deliveries' inbox has read. */
interface IInboxEvent {
    readonly position: InboxPosition;
    readonly at: IInstant;
}

const NEXT_INBOX_READ = Calculation.create({
    rule: DELIVERIES_INBOX,
    calculates: (latest: IInstant, rules: DeliveriesRules): IInstant =>
        latest.plus(rules.inboxJobMs),
});

const READ_LAG = Limit.create({
    rule: DELIVERIES_INBOX_READ_LAG,
    allows: (event: IInboxEvent, rules: DeliveriesRules) =>
        !event.position.isTooOldToRead(event.at, rules.readLagMs),
});

/** When deliveries next reads its inbox, after its latest read. */
export const nextDeliveriesInboxAt = (latest: IInstant, rules: DeliveriesRules): IInstant =>
    NEXT_INBOX_READ.valueFor(latest, rules);

/** Whether deliveries' inbox still reads an event at this time, from where it has read to. */
export const isReadByDeliveries = (
    position: InboxPosition,
    at: IInstant,
    rules: DeliveriesRules,
): boolean => READ_LAG.isWithin({ position, at }, rules);
