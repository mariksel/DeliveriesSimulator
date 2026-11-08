/** A top-level section of the application, from FND-53. */
export interface ISection {
    readonly path: string;
    readonly title: string;
    readonly summary: string;
}

/** Where the application opens. */
export const RUNS_PATH = 'runs';

/** The sections not built yet, each of which shows an empty page saying what will go there. */
export const SECTIONS_TO_COME: readonly ISection[] = [
    {
        path: 'versions',
        title: 'Versions',
        summary: 'The version timeline, editor, summaries, and compatibility matrix.',
    },
    {
        path: 'comparisons',
        title: 'Comparisons',
        summary: 'Comparison dashboards and run differences.',
    },
    {
        path: 'city',
        title: 'City, profiles, and conformance',
        summary: 'Edit cities and behaviour profiles, and handle the conformance exchange files.',
    },
    {
        path: 'criteria',
        title: 'Criteria and coverage',
        summary:
            'The criteria tracker, criteria and invariant editors, the coverage map, and coverage goals.',
    },
    {
        path: 'analysis',
        title: 'Analysis',
        summary:
            'Parameter sweeps, sensitivity analysis, the value optimiser, and statistics across seeds.',
    },
    {
        path: 'assumptions',
        title: 'Assumptions and open questions',
        summary:
            'The assumption register, undecided items, option switches, and documentation gaps.',
    },
    {
        path: 'faults',
        title: 'Faults and races',
        summary: 'Fault presets, the race explorer, and the model checker with its proof reports.',
    },
    {
        path: 'findings',
        title: 'Findings',
        summary:
            "The flaws found, their fix paths, and the items they feed into the real service's backlog.",
    },
    {
        path: 'stored-data',
        title: 'Stored data',
        summary: 'Stored runs, import and export, and storage use.',
    },
];

/** All the sections, in the order the sidebar shows them. */
export const SECTIONS: readonly ISection[] = [
    {
        path: RUNS_PATH,
        title: 'Runs and scenarios',
        summary: 'Start runs and browse the scenario library.',
    },
    ...SECTIONS_TO_COME,
];
