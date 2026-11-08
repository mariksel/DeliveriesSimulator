import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { V1_DELIVERIES_RULES } from './deliveries-rules';
import { deepFrozen } from '../../system/classes/deep-freeze.testing';
import type { OrdersOutboxEvent } from '../../orders/orders-outbox-event';
import { DeliveriesState } from './deliveries-state';

describe('a deliveries inbox pass that finds nothing to read', () => {
    it('has nothing to do, so nothing changes', () => {
        const deliveriesState = DeliveriesState.createNew();
        const outbox = List<OrdersOutboxEvent>();
        const state = deepFrozen(deliveriesState);
        const due = DeliveriesState.dueOrdersEvents(state, outbox, V1_DELIVERIES_RULES);
        expect(due.size).toBe(0);
    });
});
