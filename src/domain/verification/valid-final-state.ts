import type { List } from 'immutable';

import { FINAL_ORDER_STATUSES } from '../orders/final-order-statuses';
import type { IViolation } from './criterion';
import { Criterion } from './criterion';
import type { IRunRecord } from './run-record';

/** FND-29: every order ends in a valid final state, and none is stuck forever. */
export const validFinalState = (run: IRunRecord): List<IViolation> =>
    run.statuses
        .entrySeq()
        .filter(([, { status }]) => !FINAL_ORDER_STATUSES.includes(status))
        .map(([orderId, { status, sequence }]) => ({
            criterion: Criterion.ValidFinalState,
            sequence,
            message: `Order ${orderId} ended as ${status}, which is not a final state.`,
        }))
        .toList();
