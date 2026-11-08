import { describe, expect, it } from 'vitest';

import { runRecord } from './run-record.testing';
import { validFinalState } from './valid-final-state';
import type { OrderStatus } from '../orders/order-status';
import { toLogSequence } from '../event-log/numbers';

describe('Valid final state', () => {
    // OrderReturned and Cancelled are statuses the lifecycle adds later, which the rules already
    // treat as final.
    it.each<OrderStatus>([
        'Delivered',
        'OrderReturned' as OrderStatus,
        'Cancelled' as OrderStatus,
    ])('accepts an order that ended as %s', (status) => {
        const run = runRecord({ statuses: { A: { sequence: toLogSequence(7), status } } });

        const violations = validFinalState(run).toArray();
        expect(violations).toEqual([]);
    });

    it('reports an order that did not reach a final state, at the entry that last set its status', () => {
        const run = runRecord({
            statuses: { A: { sequence: toLogSequence(7), status: 'PickedUp' } },
        });

        const violations = validFinalState(run).toArray();
        expect(violations).toEqual([
            {
                criterion: 'Valid final state',
                sequence: 7,
                message: 'Order A ended as PickedUp, which is not a final state.',
            },
        ]);
    });

    it('reports only the orders that did not finish', () => {
        const run = runRecord({
            statuses: {
                A: { sequence: toLogSequence(1), status: 'Delivered' },
                B: { sequence: toLogSequence(2), status: 'DriverAssigned' },
                C: { sequence: toLogSequence(3), status: 'Cancelled' as OrderStatus },
                D: { sequence: toLogSequence(4), status: 'Created' },
            },
        });

        const secondValidFinalState = validFinalState(run)
            .map((violation) => violation.sequence)
            .toArray();
        expect(secondValidFinalState).toEqual([2, 4]);
    });

    it('has nothing to report with no orders', () => {
        const run = runRecord({});
        const violations = validFinalState(run).toArray();
        expect(violations).toEqual([]);
    });
});
