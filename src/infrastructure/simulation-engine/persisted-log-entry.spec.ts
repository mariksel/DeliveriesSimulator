import { describe, expect, it } from 'vitest';

import type { RunLogRecord } from '../../application-core/simulation-engine/run-log-entry';
import {
    commandIssued,
    commandRefused,
    configChanged,
    deliveriesEvent,
    deliveriesOutbox,
    entryOf,
    inboxRead,
    indirectEffectHappened,
    notificationSent,
    orderCreated,
    ordersEvent,
    ordersOutbox,
} from '../../application-core/simulation-engine/run-log-entries.testing';
import {
    IGNORED,
    LATE,
    REFUSED,
} from '../../application-core/simulation-engine/indirect-effects.testing';
import { fromPersistedLogEntry, toPersistedLogEntry } from './persisted-log-entry';

describe('a persisted log entry', () => {
    it.each<[string, RunLogRecord]>([
        ['a new order', orderCreated()],
        ['an orders event', ordersEvent()],
        ['an orders outbox event', ordersOutbox()],
        ['an inbox read', inboxRead('deliveries', 'orders-outbox')],
        ['a deliveries event', deliveriesEvent()],
        ['a deliveries outbox event', deliveriesOutbox()],
        ['a notification', notificationSent()],
        ['an issued command', commandIssued('create-order')],
        ['a refused command', commandRefused('accept', 'UnknownOrder')],
        ['a config change', configChanged()],
        ['a driver ignoring a request', indirectEffectHappened(IGNORED)],
        ['a restaurant running late', indirectEffectHappened(LATE)],
        ['a customer not taking an order', indirectEffectHappened(REFUSED)],
    ])('maps back exactly, for %s', (_name, record) => {
        const entry = entryOf(3, record, { at: 7, causedBy: 1, trace: 0 });

        const persisted = toPersistedLogEntry(entry);
        const loaded = fromPersistedLogEntry(persisted);

        expect(loaded).toEqual(entry);
    });

    it('is plain data, which JSON keeps exactly', () => {
        const record = ordersEvent();
        const entry = entryOf(0, record);
        const persisted = toPersistedLogEntry(entry);

        const text = JSON.stringify(persisted);
        const parsed: unknown = JSON.parse(text);

        expect(parsed).toEqual(persisted);
    });

    it.each<[string, unknown]>([
        ['NaN', Number.NaN],
        ['infinity', Number.POSITIVE_INFINITY],
        ['a date', new Date(0)],
        ['a bad value deep inside', { deep: [Number.NaN] }],
    ])('refuses data that JSON cannot keep: %s', (_name, refusal) => {
        const record = commandRefused('accept', 'UnknownOrder');
        const bad = { ...record, data: { ...record.data, refusal } } as RunLogRecord;
        const entry = entryOf(0, bad);

        expect(() => toPersistedLogEntry(entry)).toThrow('JSON cannot keep');
    });
});
