import { describe, expect, it } from 'vitest';

import type { ICommit } from '../../application-core/simulation-engine/commit';
import type {
    InputEffect,
    IJobEffect,
} from '../../application-core/simulation-engine/direct-effect';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import type { IMainRoot } from '../../application-core/simulation-engine/main-root';
import {
    RecordKind,
    recordOfVersion,
    versionIn,
} from '../../application-core/simulation-engine/record-ref';
import type { IRunState } from '../../application-core/simulation-engine/run-state';
import { RunJob } from '../../application-core/simulation-engine/run-work';
import { versionChain } from '../../domain/system/records/version-chain';
import { forkedRun, oneOrderRun, variedRun } from './sample-runs.testing';

const ONE_ORDER = oneOrderRun();
const RUNS: [string, IRunState][] = [
    ['the one-order run', ONE_ORDER],
    ['the varied run', variedRun()],
    ['the forked run', forkedRun()],
];

/** A work's effect commit, and the root just before its job run or API call began. */
interface IWork {
    readonly commit: ICommit;
    readonly effect: InputEffect | IJobEffect;
    readonly before: IMainRoot;
}

/** Every job run and API call on a run's current line, with the root before it. */
function worksOf(run: IRunState): IWork[] {
    const commits = run.line.commits.valueSeq().toArray();
    return commits.flatMap((commit) => {
        const { effect } = commit;
        if (
            effect === null ||
            effect.kind === EffectKind.ConfigChange ||
            effect.kind === EffectKind.ImplementationChange
        ) {
            return [];
        }
        const first = commits.findIndex((each) => each.session === commit.session);
        const before = first === 0 ? run.line.start : commits[first - 1]!.root;
        return [{ commit, effect, before }];
    });
}

/** The kinds of record an API call read, by its command, in the one-order run. */
function readKindsOf(command: string): string[] {
    const works = worksOf(ONE_ORDER);
    const call = works.find(
        ({ effect }) => effect.kind === EffectKind.Input && effect.command === command,
    );
    return call!.effect.reads.map((version) => recordOfVersion(version).kind);
}

describe('what a job run or API call read', () => {
    it.each([
        ['create-order', []],
        ['request-delivery', [RecordKind.Order]],
        ['mark-ready', [RecordKind.Order]],
        ['accept', [RecordKind.Order, RecordKind.Driver, RecordKind.Delivery]],
        ['pick-up', [RecordKind.Order, RecordKind.Driver, RecordKind.Delivery]],
        ['deliver', [RecordKind.Order, RecordKind.Driver, RecordKind.Delivery]],
    ])('lists for %s the records it names and changed', (command, kinds) => {
        const read = readKindsOf(command);

        expect(read).toEqual(kinds);
    });

    it.each(RUNS)('lists each version as it stood before the work began, in %s', (_name, run) => {
        const reads = worksOf(run).flatMap(({ effect, before }) =>
            effect.reads.map((version) => ({ version, before })),
        );

        const asBefore = reads.map(({ version, before }) => {
            const record = recordOfVersion(version);
            return versionIn(before, record) === version;
        });

        const isEveryAsBefore = asBefore.every(Boolean);
        expect(reads.length).toBeGreaterThan(0);
        expect(isEveryAsBefore).toBe(true);
    });

    it.each(RUNS)('points into the state of the root that holds it, in %s', (_name, run) => {
        const reads = worksOf(run).flatMap(({ commit, effect }) =>
            effect.reads.map((version) => ({ version, root: commit.root })),
        );

        const inChain = reads.map(({ version, root }) => {
            const record = recordOfVersion(version);
            const latest = versionIn(root, record)!;
            const chain = versionChain(latest as never);
            return chain.includes(version as never);
        });

        const isEveryInChain = inChain.every(Boolean);
        expect(isEveryInChain).toBe(true);
    });

    it('lists the driver a dispatch pass notified', () => {
        const passes = worksOf(ONE_ORDER).filter(
            ({ effect }) => effect.kind === EffectKind.Job && effect.job === RunJob.DispatchPass,
        );

        const notifying = passes.filter(({ effect }) => effect.reads.length > 0);
        const kinds = notifying.flatMap(({ effect }) =>
            effect.reads.map((version) => recordOfVersion(version).kind),
        );

        const distinct = [...new Set(kinds)];
        expect(notifying.length).toBeGreaterThan(0);
        expect(distinct).toEqual([RecordKind.Driver]);
    });

    it('lists nothing for a job run that found nothing to do', () => {
        const idle = worksOf(ONE_ORDER).filter(
            ({ effect }) => effect.kind === EffectKind.Job && effect.stateCommits === 0,
        );
        const reading = idle.filter(({ effect }) => effect.reads.length > 0);

        expect(idle.length).toBeGreaterThan(0);
        expect(reading).toEqual([]);
    });
});
