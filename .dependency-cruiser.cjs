const { readFileSync } = require('node:fs');

function layerRule(name, from, forbidden) {
    return {
        name,
        severity: 'error',
        from: { path: `^src/${from}/` },
        to: { path: `^src/(${forbidden.join('|')})/` },
    };
}

const IN_A_LAYER = 'src/(domain|application-core|application|infrastructure|ui)';
const folderOf = (moduleName) => moduleName.toLowerCase().replace(/ /g, '-');
const EVERY_MODULE = 'Every module';
/** A file directly in a layer's root that must hold module folders only. */
const ROOT_FILE = '^src/(domain|infrastructure)/[^/]+$';

/**
 * One rule per module, from the confirmed graph in the module map, so the two cannot drift apart.
 */
function moduleGraphRules() {
    const map = readFileSync('docs/design/modules/README.md', 'utf8').replace(/\r/g, '');
    const graph = map.match(/## Dependency graph[\s\S]*?```text\n([\s\S]*?)```/)?.[1];
    if (!graph) {
        throw new Error('No dependency graph found in the module map.');
    }
    const uses = new Map();
    let current;
    for (const line of graph.split('\n').filter(Boolean)) {
        const dependency = line.match(/^ +──.+──> (.+)$/)?.[1];
        if (dependency === undefined) {
            current = line.trim();
            const secondSet = new Set();
            uses.set(current, secondSet);
        } else {
            uses.get(current).add(dependency);
            if (!uses.has(dependency)) {
                const secondSet = new Set();
                uses.set(dependency, secondSet);
            }
        }
    }
    // "Every module" names what all modules use, such as System, rather than a module.
    const everyModule = uses.get(EVERY_MODULE) ?? new Set();
    uses.delete(EVERY_MODULE);
    for (const [name, used] of uses) {
        for (const dependency of everyModule) {
            if (dependency !== name) {
                used.add(dependency);
            }
        }
    }
    const modules = [...uses.keys()];
    return modules.map((name) => {
        const forbidden = modules
            .filter((other) => other !== name && !uses.get(name).has(other))
            .map(folderOf);
        return {
            name: `module-graph: ${name}`,
            severity: 'error',
            comment:
                'A dependency not shown in docs/design/modules/README.md does not exist. Add it there first.',
            from: { path: `^${IN_A_LAYER}/${folderOf(name)}/` },
            to: { path: `^${IN_A_LAYER}/(${forbidden.join('|')})/` },
        };
    });
}

/** The dependency rules of docs/design/architecture/layers.md and the module map. */
module.exports = {
    forbidden: [
        layerRule('domain-depends-on-nothing', 'domain', [
            'application-core',
            'application',
            'infrastructure',
            'ui',
            'composition',
        ]),
        layerRule('application-core-depends-on-domain-only', 'application-core', [
            'application',
            'infrastructure',
            'ui',
            'composition',
        ]),
        layerRule('application-depends-on-core-and-domain-only', 'application', [
            'infrastructure',
            'ui',
            'composition',
        ]),
        layerRule('infrastructure-not-on-application-or-ui', 'infrastructure', [
            'application',
            'ui',
            'composition',
        ]),
        layerRule('ui-not-on-infrastructure', 'ui', ['infrastructure', 'composition']),
        {
            name: 'core-is-framework-free',
            severity: 'error',
            from: { path: '^src/(domain|application-core|application)/' },
            to: { path: '^(node_modules/)?@angular/' },
        },
        {
            name: 'no-unresolved-imports',
            severity: 'error',
            from: { path: '^src/' },
            to: { couldNotResolve: true },
        },
        {
            name: 'no-import-cycles',
            severity: 'error',
            from: { path: '^src/' },
            to: { circular: true },
        },
        // A layer's root holds module folders only: shared code sits in a System submodule
        // (FND-85). The three rules catch a root file whatever its imports: one that imports, one
        // that is imported, and one that does neither.
        {
            name: 'no-files-at-layer-roots',
            severity: 'error',
            from: { path: ROOT_FILE },
            to: {},
        },
        {
            name: 'no-imports-of-layer-root-files',
            severity: 'error',
            from: { path: '^src/' },
            to: { path: ROOT_FILE },
        },
        {
            name: 'no-lone-files-at-layer-roots',
            severity: 'error',
            from: { orphan: true, path: ROOT_FILE },
            to: {},
        },
        ...moduleGraphRules(),
    ],
    options: {
        doNotFollow: { path: 'node_modules' },
        tsConfig: { fileName: 'tsconfig.json' },
        // Counts type-only imports too, which the compiler would otherwise erase.
        tsPreCompilationDeps: true,
        enhancedResolveOptions: {
            exportsFields: ['exports'],
            conditionNames: ['types', 'import', 'default'],
            extensions: ['.ts', '.js', '.d.ts'],
        },
    },
};
