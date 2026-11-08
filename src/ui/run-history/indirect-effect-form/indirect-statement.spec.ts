import { describe, expect, it } from 'vitest';

import { IndirectKind } from '../../../application-core/simulation-engine/indirect-effect';
import { actorsFor, choiceOf, indirectStatementOf } from './indirect-statement';

const NAMES = { drivers: ['driver-1'], restaurants: ['restaurant-1'], orders: ['A'] };

describe('the indirect effect form', () => {
    it('offers drivers, restaurants, or nobody as who decides, by kind', () => {
        const drivers = actorsFor(IndirectKind.DriverIgnoresRequest, NAMES);
        const restaurants = actorsFor(IndirectKind.RestaurantRunsLate, NAMES);
        const nobody = actorsFor(IndirectKind.CustomerWontTakeOrder, NAMES);

        expect(drivers).toEqual(['driver-1']);
        expect(restaurants).toEqual(['restaurant-1']);
        expect(nobody).toEqual([]);
    });

    it('falls back to the first kind for text that names none', () => {
        const choice = choiceOf('driver-sleeps');

        expect(choice.kind).toBe(IndirectKind.DriverIgnoresRequest);
    });

    it('makes a statement stated by hand, with no label, for each kind', () => {
        const ignored = indirectStatementOf({
            kind: IndirectKind.DriverIgnoresRequest,
            actor: 'driver-1',
            order: 'A',
            lateBy: '',
        });
        const late = indirectStatementOf({
            kind: IndirectKind.RestaurantRunsLate,
            actor: 'restaurant-1',
            order: 'A',
            lateBy: ' h00:m01:s30:ms00 ',
        });
        const wont = indirectStatementOf({
            kind: IndirectKind.CustomerWontTakeOrder,
            actor: 'driver-1',
            order: 'A',
            lateBy: '',
        });

        expect(ignored).toEqual({
            isOk: true,
            statement: {
                kind: 'driver-ignores-request',
                order: 'A',
                label: null,
                actor: 'driver-1',
            },
        });
        expect(late).toMatchObject({ isOk: true, statement: { kind: 'restaurant-runs-late' } });
        expect(late).toHaveProperty('statement.lateBy.milliseconds', 90_000);
        expect(wont).toEqual({
            isOk: true,
            statement: { kind: 'customer-wont-take-order', order: 'A', label: null },
        });
    });

    it.each([
        ['no order', IndirectKind.CustomerWontTakeOrder, 'driver-1', '', '', 'Choose an order.'],
        ['nobody deciding', IndirectKind.DriverIgnoresRequest, '', 'A', '', 'Choose who decides.'],
        [
            'a delay that is not a time',
            IndirectKind.RestaurantRunsLate,
            'restaurant-1',
            'A',
            'soon',
            'How much later is a time above none, such as h00:m01:s30:ms00.',
        ],
        [
            'no delay',
            IndirectKind.RestaurantRunsLate,
            'restaurant-1',
            'A',
            'h00:m00:s00:ms00',
            'How much later is a time above none, such as h00:m01:s30:ms00.',
        ],
    ])('says what is wrong with %s', (_name, kind, actor, order, lateBy, problem) => {
        const result = indirectStatementOf({ kind, actor, order, lateBy });

        expect(result).toEqual({ isOk: false, problem });
    });
});
