import { List } from 'immutable';
import { describe, expect, it } from 'vitest';

import { V1_ORDERS_RULES } from './orders-rules';
import { deepFrozen } from '../system/classes/deep-freeze.testing';
import type { DeliveriesOutboxEvent } from '../drivers/deliveries/deliveries-outbox-event';
import { OrdersState } from './orders-state';

describe('an orders inbox pass that finds nothing to read', () => {
    it('has nothing to do, so nothing changes', () => {
        const ordersState = OrdersState.createNew();
        const outbox = List<DeliveriesOutboxEvent>();
        const state = deepFrozen(ordersState);
        const due = OrdersState.dueDeliveriesEvents(state, outbox, V1_ORDERS_RULES);
        expect(due.size).toBe(0);
    });
});
