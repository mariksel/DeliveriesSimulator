import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { List } from 'immutable';
import { beforeEach, describe, expect, it } from 'vitest';

import { appendEntry } from '../../../domain/event-log/event-log';
import type {
    RunLogEntry,
    RunLogRecord,
} from '../../../application-core/simulation-engine/run-log-entry';
import { TraceDiagram } from './trace-diagram';
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
const ONE_ENTRY = looseAppend(EMPTY_LOG, {
    at: 0,
    source: 'actors',
    kind: 'CommandIssued',
    data: { name: 'request' },
});
const LOG = looseAppend(ONE_ENTRY, {
    at: 2000,
    source: 'orders',
    kind: 'OutboxEventWritten',
    data: { id: 'orders-outbox-1', kind: 'OrderReady' },
    causedBy: 0,
});

describe('the trace diagram', () => {
    let fixture: ComponentFixture<TraceDiagram>;
    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const steps = (): HTMLElement[] => [
        ...element().querySelectorAll<HTMLElement>('[data-testid="trace-step"]'),
    ];

    beforeEach(() => {
        fixture = TestBed.createComponent(TraceDiagram);
        fixture.componentRef.setInput('entries', LOG);
    });

    it('asks for a selection when there is none', async () => {
        await fixture.whenStable();

        expect(element().textContent).toContain('Select an event to see its trace.');
    });

    it('shows each step, with what passed before it, and what is waiting', async () => {
        fixture.componentRef.setInput('selected', 0);
        await fixture.whenStable();

        const secondSteps = steps().map((step) => step.textContent);
        expect(secondSteps).toEqual([
            expect.stringContaining('#0 Command: request') as string,
            expect.stringMatching(/\+2 s.*#1 Written: OrderReady.*waiting/) as string,
        ]);
    });

    it('selects a step when it is clicked', async () => {
        fixture.componentRef.setInput('selected', 0);
        await fixture.whenStable();
        const chosen: number[] = [];
        fixture.componentInstance.choose.subscribe((sequence) => chosen.push(sequence));

        steps()[1]!.click();

        expect(chosen).toEqual([1]);
    });
});
