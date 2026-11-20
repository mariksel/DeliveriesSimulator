import type { BranchId } from '../../application-core/simulation-engine/branch-id';
import { CommitKind } from '../../application-core/simulation-engine/commit';
import { EffectKind } from '../../application-core/simulation-engine/direct-effect';
import type { IGridCommit, ITimelineNode } from './timeline-grid';
import { NodeKind } from './timeline-grid';

/** The kinds of commit the timeline's filter hides; none by default (FND-81). */
export type HiddenKinds = ReadonlySet<CommitKind>;

/** Each column's commits under a node, oldest first. */
type Commits = ReadonlyMap<BranchId, readonly IGridCommit[]>;

/** Nothing hidden: every commit shows. */
export const NOTHING_HIDDEN: HiddenKinds = new Set();

/**
 * The nodes as shown, kept for each list of nodes and each filter. A grid gives a level's nodes
 * as the same list until something under it changes, so a level that did not change is not
 * worked out again, which keeps a city day's timeline fast while it is followed.
 */
const SHOWN = new WeakMap<
    HiddenKinds,
    WeakMap<readonly ITimelineNode[], readonly ITimelineNode[]>
>();

/** How many back-to-back empty job runs collapse into one row, at the least. */
const FEWEST_TO_COLLAPSE = 2;

/** A column's commits with the kinds the filter hides left out, and an emptied column dropped. */
function shownOf(commits: Commits, hidden: HiddenKinds): Commits {
    if (hidden.size === 0) {
        return commits;
    }
    const shown = new Map<BranchId, readonly IGridCommit[]>();
    commits.forEach((own, column) => {
        const kept = own.filter((gridCommit) => !hidden.has(gridCommit.commit.kind));
        if (kept.length > 0) {
            shown.set(column, kept);
        }
    });
    return shown;
}

/** Each column's commits under several nodes, one after another: in place order, as they are. */
function joined(nodes: readonly ITimelineNode[], pick: (node: ITimelineNode) => Commits): Commits {
    const all = new Map<BranchId, IGridCommit[]>();
    nodes.forEach((node) => {
        const commits = pick(node);
        commits.forEach((own, column) => {
            const before = all.get(column) ?? [];
            all.set(column, [...before, ...own]);
        });
    });
    return all;
}

/**
 * Whether a node is an empty job run: a job run that made no state commit, so every commit it
 * holds, in every column, is its job's own (FND-81).
 */
function isEmptyRun(node: ITimelineNode): boolean {
    if (node.kind !== NodeKind.Session) {
        return false;
    }
    return [...node.commits.values()].every((own) =>
        own.every((gridCommit) => gridCommit.commit.kind === CommitKind.Job),
    );
}

/** The job a job run is of, from its job commit. */
function jobOf(node: ITimelineNode): string {
    const commits = [...node.commits.values()].flat();
    const effect = commits.find((gridCommit) => gridCommit.commit.effect !== null)?.commit.effect;
    return effect?.kind === EffectKind.Job ? effect.job : '';
}

/**
 * A node as shown: its commits with the kinds the filter hides left out, and its children shown
 * the same way, worked out the first time they are asked for.
 */
class ShownNode implements ITimelineNode {
    private shownChildren: readonly ITimelineNode[] | null = null;

    get key(): string {
        return this.inner.key;
    }

    get kind(): NodeKind {
        return this.inner.kind;
    }

    get label(): string {
        return this.inner.label;
    }

    get subject(): ITimelineNode['subject'] {
        return this.inner.subject;
    }

    get children(): readonly ITimelineNode[] {
        this.shownChildren ??= shownNodes(this.inner.children, this.hidden);
        return this.shownChildren;
    }

    /** Every commit under it, the hidden ones too, so a hidden commit shown is found. */
    get held(): Commits {
        return this.inner.held ?? this.inner.commits;
    }

    constructor(
        readonly inner: ITimelineNode,
        readonly commits: Commits,
        private readonly hidden: HiddenKinds,
    ) {}
}

/** A node as shown, or null when the filter hides every commit under it. */
function shownNode(node: ITimelineNode, hidden: HiddenKinds): ShownNode | null {
    const commits = shownOf(node.commits, hidden);
    return commits.size === 0 ? null : new ShownNode(node, commits, hidden);
}

/**
 * A group made of other nodes, such as the empty job runs of one job. Its commits come from its
 * runs in their order, which keeps each column's commits in place order, as finding one needs.
 */
function groupOf(
    key: string,
    kind: NodeKind,
    label: string,
    children: readonly ITimelineNode[],
    runs: readonly ITimelineNode[],
): ITimelineNode {
    return {
        key,
        kind,
        label,
        subject: null,
        children,
        commits: joined(runs, (node) => node.commits),
        held: joined(runs, (node) => node.held ?? node.commits),
    };
}

const runsText = (count: number): string => (count === 1 ? '1 empty run' : `${count} empty runs`);

/**
 * Back-to-back empty job runs as one row, which opens to them grouped by job, in the order each
 * job first ran, each job's runs closed again (FND-81).
 */
function collapsedRuns(runs: readonly ShownNode[]): ITimelineNode {
    const [first] = runs;
    const key = `${first?.key ?? ''}~empty`;
    const byJob = Map.groupBy(runs, (run) => jobOf(run.inner));
    const jobs = [...byJob].map(([job, own]) =>
        groupOf(`${key}/${job}`, NodeKind.JobRuns, `${job}: ${runsText(own.length)}`, own, own),
    );
    return groupOf(key, NodeKind.EmptyRuns, `${runs.length} empty job runs`, jobs, runs);
}

/** The nodes with each run of back-to-back empty job runs, two or more, made one row. */
function withRunsCollapsed(nodes: readonly ShownNode[]): readonly ITimelineNode[] {
    const rows: ITimelineNode[] = [];
    let runs: ShownNode[] = [];
    const flush = (): void => {
        if (runs.length >= FEWEST_TO_COLLAPSE) {
            const collapsed = collapsedRuns(runs);
            rows.push(collapsed);
        } else {
            rows.push(...runs);
        }
        runs = [];
    };
    nodes.forEach((node) => {
        if (isEmptyRun(node.inner)) {
            runs.push(node);
            return;
        }
        flush();
        rows.push(node);
    });
    flush();
    return rows;
}

/**
 * The nodes as the timeline shows them (FND-81): each kind of commit the filter hides left out,
 * and a node left with none dropped; then, at each level, back-to-back empty job runs collapsed
 * into one row. A shown node keeps every commit under it as `held`, so the commit shown is still
 * found in the group holding it when the filter hides it. It works only on the levels opened.
 */
export function shownNodes(
    nodes: readonly ITimelineNode[],
    hidden: HiddenKinds,
): readonly ITimelineNode[] {
    const known =
        SHOWN.get(hidden) ?? new WeakMap<readonly ITimelineNode[], readonly ITimelineNode[]>();
    SHOWN.set(hidden, known);
    const cached = known.get(nodes);
    if (cached !== undefined) {
        return cached;
    }
    const shown = nodes.flatMap((node) => {
        const kept = shownNode(node, hidden);
        return kept === null ? [] : [kept];
    });
    const collapsed = withRunsCollapsed(shown);
    known.set(nodes, collapsed);
    return collapsed;
}
