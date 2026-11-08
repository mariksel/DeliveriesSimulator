import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { List } from 'immutable';
import { beforeEach, describe, expect, it } from 'vitest';

import { appendEntry } from '../../../domain/event-log/event-log';
import type {
    RunLogEntry,
    RunLogRecord,
} from '../../../application-core/simulation-engine/run-log-entry';
import { OutboxInboxInspector } from './outbox-inbox-inspector';
import { toLogSequence } from '../../../domain/event-log/numbers';
import { toSimTime } from '../../../domain/simulation-engine/sim-time';

/** An entry built loosely, as these tests do not care about every field of its data. */
interface ILooseEntry {
    readonly at: number;
    readonly source: string;
    readonly kind: string;
    readonly data: unknown;
    readonly causedBy?: number | undefined;
}

/** Logs a loosely built entry as a run's typed entry. */
function looseAppend(log: List<RunLogEntry>, entry: ILooseEntry): List<RunLogEntry> {
    const at = toSimTime(entry.at);
    const causedBy = entry.causedBy === undefined ? undefined : toLogSequence(entry.causedBy);
    return appendEntry(
        log,
        at,
        { source: entry.source, kind: entry.kind, data: entry.data } as RunLogRecord,
        causedBy,
    );
}

const EMPTY_LOG = List<RunLogEntry>();
const LOG = looseAppend(EMPTY_LOG, {
    at: 0,
    source: 'orders',
    kind: 'OutboxEventWritten',
    data: { id: 'o-1', kind: 'OrderReady', orderId: 'order-1' },
});

describe('the Outbox and inbox inspector', () => {
    let fixture: ComponentFixture<OutboxInboxInspector>;
    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const titles = (): (string | undefined)[] =>
        [...element().querySelectorAll('h4')].map((title) => title.textContent.trim());
    const button = (name: string): HTMLButtonElement =>
        [...element().querySelectorAll('button')].find(
            (candidate) => candidate.textContent.trim() === name,
        )!;

    beforeEach(async () => {
        fixture = TestBed.createComponent(OutboxInboxInspector);
        fixture.componentRef.setInput('entries', LOG);
        fixture.componentRef.setInput('now', 0);
        await fixture.whenStable();
    });

    it('starts by flow, with the counts', () => {
        const secondTitles = titles();
        expect(secondTitles).toEqual([
            'Orders to deliveries: 1 written, 0 read, 1 waiting',
            expect.any(String),
        ]);
    });

    it('toggles to each outbox and inbox', async () => {
        button('By module').click();
        await fixture.whenStable();

        const secondTitles = titles();
        expect(secondTitles).toHaveLength(4);
        expect(titles()[0]).toContain('Orders outbox');
    });

    it('toggles back', async () => {
        button('By module').click();
        await fixture.whenStable();

        button('By flow').click();
        await fixture.whenStable();

        const secondTitles = titles();
        expect(secondTitles).toHaveLength(2);
    });

    it('marks the view chosen', () => {
        const attribute = button('By flow').getAttribute('aria-pressed');
        expect(attribute).toBe('true');
        const ariaPressed = button('By module').getAttribute('aria-pressed');
        expect(ariaPressed).toBe('false');
    });

    it('takes a mode from outside, so it survives leaving the workspace', async () => {
        fixture.componentRef.setInput('mode', 'ByModule');
        await fixture.whenStable();

        const secondTitles = titles();
        expect(secondTitles).toHaveLength(4);
    });
});
