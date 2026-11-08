import { List } from 'immutable';

import { statedParameter, statedRule } from '../../business-rules/as-stated';
import { ParameterKind } from '../../business-rules/parameter-kind';
import { RuleKind } from '../../business-rules/rule-kind';
import { UsableValues } from '../../business-rules/usable-values';

/**
 * Deliveries' rules of V1.0.0, written with the Business rules abstractions (FND-84): its
 * communication values. The values are as the V1.0.0 pages state them, and the user accepted the
 * ranges on 2026-11-07.
 */

const COMMUNICATION = 'V1.0.0 module communication: Inboxes';

/** How often deliveries reads its inbox. */
export const DELIVERIES_INBOX_INTERVAL = statedParameter({
    id: 'interval',
    name: 'Deliveries inbox interval',
    text: 'How long after one read of the orders outbox the next runs.',
    kind: ParameterKind.Duration,
    usable: UsableValues.WholeAboveZero,
    defaultValue: 5000,
    lowest: 1000,
    highest: 60_000,
});

/** How far back deliveries' inbox starts reading. */
export const DELIVERIES_READ_LAG = statedParameter({
    id: 'read-lag',
    name: 'Deliveries read lag',
    text: 'The inbox starts reading this long before the latest event it has read.',
    kind: ParameterKind.Duration,
    defaultValue: 60_000,
    lowest: 0,
    highest: 300_000,
});

/** When deliveries next reads its inbox. */
export const DELIVERIES_INBOX = statedRule({
    id: 'drivers.deliveries.inbox',
    name: 'Deliveries inbox',
    text: 'Deliveries reads the orders outbox at a fixed interval.',
    source: COMMUNICATION,
    kind: RuleKind.Calculation,
    parameters: [DELIVERIES_INBOX_INTERVAL],
});

/** Which events deliveries' inbox still reads. */
export const DELIVERIES_INBOX_READ_LAG = statedRule({
    id: 'drivers.deliveries.inbox-read-lag',
    name: 'Deliveries inbox read lag',
    text: 'An event older than the read lag before the latest event read is not read.',
    source: COMMUNICATION,
    kind: RuleKind.Limit,
    parameters: [DELIVERIES_READ_LAG],
});

/** Deliveries' rules, in the order the Rules panel lists them. */
export const DELIVERIES_RULE_LIST = List([DELIVERIES_INBOX, DELIVERIES_INBOX_READ_LAG]);
