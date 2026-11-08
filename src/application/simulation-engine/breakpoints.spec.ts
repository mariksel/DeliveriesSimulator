import { describe, expect, it } from 'vitest';

import type { IBreakpoint } from '../../application-core/simulation-engine/breakpoints';
import { breakpointHit } from '../../application-core/simulation-engine/breakpoints';
import { orderOf } from '../../application-core/simulation-engine/run-log-entry-order';
import { oneOrderRun } from './one-order-run.testing';

const RUN = oneOrderRun();
const ENTRIES = RUN.cache.log.entries;

/** A breakpoint that is on, for a kind, narrowed as asked. */
function breakpoint(kind: string, narrowed: Partial<IBreakpoint> = {}): IBreakpoint {
    return { id: 1, kind, source: null, order: null, isOn: true, ...narrowed };
}

describe('breakpoints', () => {
    it('reach nothing while none is on', () => {
        const off = breakpoint('OrderPickedUp', { isOn: false });

        const hit = breakpointHit([off], ENTRIES, ENTRIES);

        expect(hit).toBeNull();
    });

    it('reach the first event of their kind the work wrote', () => {
        const pickedUp = breakpoint('InboxEventRead');

        const hit = breakpointHit([pickedUp], ENTRIES, ENTRIES);

        const first = ENTRIES.find((entry) => entry.kind === 'InboxEventRead');
        expect(hit?.entry).toBe(first);
        expect(hit?.breakpoint).toBe(pickedUp);
    });

    it('can be narrowed to a source module', () => {
        const fromDeliveries = breakpoint('InboxEventRead', { source: 'deliveries' });

        const hit = breakpointHit([fromDeliveries], ENTRIES, ENTRIES);

        expect(hit?.entry.source).toBe('deliveries');
    });

    it("can be narrowed to an order, found through an entry's cause when it names none", () => {
        const forOrder = breakpoint('InboxEventRead', { order: 'order-1' });
        const forOther = breakpoint('InboxEventRead', { order: 'order-2' });

        const hit = breakpointHit([forOrder], ENTRIES, ENTRIES);
        const none = breakpointHit([forOther], ENTRIES, ENTRIES);

        const order = hit === null ? '' : orderOf(hit.entry, ENTRIES);
        expect(order).toBe('order-1');
        expect(none).toBeNull();
    });

    it('stop at the earliest event written, whichever breakpoint it reaches', () => {
        const late = breakpoint('OrderDelivered', { id: 1 });
        const early = breakpoint('CommandIssued', { id: 2 });

        const hit = breakpointHit([late, early], ENTRIES, ENTRIES);

        expect(hit?.breakpoint.id).toBe(2);
        expect(hit?.entry.sequence).toBe(0);
    });
});
