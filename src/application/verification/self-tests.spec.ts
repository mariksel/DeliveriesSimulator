import { describe, expect, it } from 'vitest';

import { List } from 'immutable';

import type { RunLogEntry } from '../../application-core/simulation-engine/run-log-entry';
import type { IRunCheck } from '../../domain/verification/check-run';
import { checkRun } from '../../application-core/verification/check-run';
import type { IViolation } from '../../domain/verification/criterion';
import { Criterion } from '../../domain/verification/criterion';
import { runSelfTests } from './self-tests';
import { toCount } from '../../domain/system/math/math';

/** A checker that finds a problem on the stated criteria, and nothing on the rest. */
const checkerFinding =
    (...found: readonly Criterion[]) =>
    (): IRunCheck => ({
        isPassed: found.length === 0,
        results: Object.values(Criterion).map((criterion) => ({
            criterion,
            violations: found.includes(criterion)
                ? List.of({ criterion, sequence: null, message: 'found' })
                : List(),
        })),
        ordersJudged: toCount(1),
    });

/** The real checker, except that it sees nothing wrong on one criterion. */
const blindTo =
    (blind: Criterion) =>
    (entries: List<RunLogEntry>): IRunCheck => {
        const check = checkRun(entries);
        const results = check.results.map((result) =>
            result.criterion === blind ? { ...result, violations: List<IViolation>() } : result,
        );
        return {
            ...check,
            results,
            isPassed: results.every((result) => result.violations.isEmpty()),
        };
    };

// Each test runs the self-tests itself: run once while loading, they would finish before mutation
// testing's changes take effect, and could not catch any.
describe('the simulator self-tests', () => {
    it('pass a known good run', () => {
        expect(runSelfTests().isKnownGoodRunPassing).toBe(true);
    });

    it('report every way of breaking a run', () => {
        const unreported = runSelfTests()
            .results.filter((result) => !result.isReported)
            .map((result) => result.name);

        expect(unreported).toEqual([]);
    });

    const cases = Object.values(Criterion);
    it.each(cases)('break %s in at least one way', (criterion) => {
        const hasResult = runSelfTests().results.some((result) => result.criterion === criterion);
        expect(hasResult).toBe(true);
    });

    it('name each way of breaking a run, under its criterion', () => {
        const names = runSelfTests().results.map((result) => [result.criterion, result.name]);

        expect(names).toEqual([
            ['Valid final state', 'an order that ends before it is delivered'],
            ['Modules agree', 'an event that only one module has'],
            ['Modules agree', 'modules that name different drivers'],
            ['Modules agree', 'an outbox event left unread at the end'],
            ['Modules agree', "a copy of the order that is behind orders' own"],
            ['Exactly-once effect', 'an outbox event read twice'],
            ['Exactly-once effect', 'an outbox event never read'],
            ['Exactly-once effect', 'a read of an event nobody wrote'],
            ['Exactly-once effect', 'an event taking effect twice'],
            ['Exactly-once effect', 'an event recorded twice'],
            ['Outbox for every event', 'an event with no outbox event'],
            ['Outbox for every event', 'an event with two outbox events'],
            ['Outbox for every event', 'an outbox event for an event nobody recorded'],
        ]);
    });

    it('come out as passed when every break is reported', () => {
        expect(runSelfTests().isPassed).toBe(true);
    });

    describe('given a checker that does not work', () => {
        it('do not pass one that finds nothing', () => {
            const check = checkerFinding();
            const report = runSelfTests(check);

            expect(report.isKnownGoodRunPassing).toBe(true);
            const hasResult = report.results.some((result) => result.isReported);
            expect(hasResult).toBe(false);
            expect(report.isPassed).toBe(false);
        });

        it('do not pass one that fails even a good run', () => {
            const check = checkerFinding(...Object.values(Criterion));
            const report = runSelfTests(check);

            expect(report.isKnownGoodRunPassing).toBe(false);
            const isEveryResult = report.results.every((result) => result.isReported);
            expect(isEveryResult).toBe(true);
            expect(report.isPassed).toBe(false);
        });

        it('do not pass the real checker when it is blind to one criterion', () => {
            const check = blindTo(Criterion.OutboxForEveryEvent);
            const report = runSelfTests(check);

            expect(report.isKnownGoodRunPassing).toBe(true);
            const results = report.results
                .filter((result) => !result.isReported)
                .map((result) => result.name);
            expect(results).toEqual([
                'an event with no outbox event',
                'an event with two outbox events',
                'an outbox event for an event nobody recorded',
            ]);
            expect(report.isPassed).toBe(false);
        });

        it('do not count a problem found under another criterion', () => {
            const check = checkerFinding(Criterion.ValidFinalState);
            const report = runSelfTests(check);

            const results = report.results
                .filter((result) => result.isReported)
                .map((result) => result.name);
            expect(results).toEqual(['an order that ends before it is delivered']);
        });

        it('do not report a criterion the checker gives no result for', () => {
            const report = runSelfTests(() => ({
                isPassed: true,
                results: [],
                ordersJudged: toCount(1),
            }));

            const hasResult = report.results.some((result) => result.isReported);
            expect(hasResult).toBe(false);
        });
    });
});
