import type { ComponentRef } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { List } from 'immutable';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TextCopier } from '../../../application-core/technical-view/text-copier';
import { appendEntry } from '../../../domain/event-log/event-log';
import type {
    RunLogEntry,
    RunLogRecord,
} from '../../../application-core/simulation-engine/run-log-entry';
import { PayloadViewer } from './payload-viewer';
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

class FakeCopier extends TextCopier {
    didCopy = true;
    readonly copied: string[] = [];
    copy(text: string): Promise<boolean> {
        this.copied.push(text);
        return Promise.resolve(this.didCopy);
    }
}

const EMPTY_LOG = List<RunLogEntry>();
const LOG = [{ a: 1 }, { b: 2 }, { c: 3 }].reduce<List<RunLogEntry>>(
    (log, data, index) =>
        looseAppend(log, {
            at: index,
            source: 'orders',
            kind: 'K',
            data,
            causedBy: index === 0 ? undefined : index - 1,
        }),
    EMPTY_LOG,
);

describe('the Payload viewer', () => {
    let copier: FakeCopier;
    let fixture: ComponentFixture<PayloadViewer>;
    let component: ComponentRef<PayloadViewer>;
    const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const shown = (id: string): HTMLElement | null =>
        element().querySelector(`[data-testid="${id}"]`);

    async function show(sequence: number): Promise<void> {
        const get = LOG.get(sequence);
        component.setInput('entry', get);
        await fixture.whenStable();
    }

    beforeEach(() => {
        copier = new FakeCopier();
        TestBed.configureTestingModule({ providers: [{ provide: TextCopier, useValue: copier }] });
        fixture = TestBed.createComponent(PayloadViewer);
        component = fixture.componentRef;
    });

    it("shows the entry's facts and its data", async () => {
        await show(1);

        expect(shown('payload-kind')?.textContent).toBe('#1 K');
        expect(shown('payload-json')?.textContent).toContain('"b": 2');
    });

    it('says when nothing caused an entry', async () => {
        await show(0);

        const payloadCausedBy = shown('payload-caused-by');
        expect(payloadCausedBy).toBeNull();
    });

    it('links to what caused an entry', async () => {
        await show(2);
        const chosen = vi.fn();
        component.instance.choose.subscribe(chosen);

        shown('payload-caused-by')?.click();

        expect(chosen).toHaveBeenCalledWith(1);
    });

    it('links to the first entry too, as a cause', async () => {
        await show(1);
        const chosen = vi.fn();
        component.instance.choose.subscribe(chosen);

        shown('payload-caused-by')?.click();

        expect(chosen).toHaveBeenCalledWith(0);
    });

    it('links to where the trace began', async () => {
        await show(2);
        const chosen = vi.fn();
        component.instance.choose.subscribe(chosen);

        shown('payload-trace')?.click();

        expect(chosen).toHaveBeenCalledWith(0);
    });

    it('copies the data, and says so', async () => {
        await show(1);

        shown('payload-copy')?.click();
        await vi.waitFor(async () => {
            await fixture.whenStable();
            expect(shown('payload-copied')?.textContent).toBe('Copied');
        });

        expect(copier.copied[0]).toContain('"b": 2');
    });

    it('says when it could not copy', async () => {
        copier.didCopy = false;
        await show(1);

        shown('payload-copy')?.click();

        await vi.waitFor(async () => {
            await fixture.whenStable();
            expect(shown('payload-copied')?.textContent).toBe('Could not copy');
        });
    });

    it('forgets that message when another entry is shown', async () => {
        await show(1);
        shown('payload-copy')?.click();
        await vi.waitFor(async () => {
            await fixture.whenStable();
            const payloadCopied = shown('payload-copied');
            expect(payloadCopied).not.toBeNull();
        });

        await show(2);

        const payloadCopied = shown('payload-copied');
        expect(payloadCopied).toBeNull();
    });
});
