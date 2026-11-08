import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import functional from 'eslint-plugin-functional';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

// The rules live on docs/design/governance/code-style.md, which says why each one is here.
const STYLE = 'docs/design/governance/code-style.md';
const blockArrow = 'VariableDeclarator > ArrowFunctionExpression[body.type="BlockStatement"]';

const FUNCTION_STYLE = [
    {
        selector: `Program > VariableDeclaration > ${blockArrow}`,
        message: `A top-level function longer than one line is a function declaration (${STYLE}).`,
    },
    {
        selector: `Program > ExportNamedDeclaration > VariableDeclaration > ${blockArrow}`,
        message: `A top-level function longer than one line is a function declaration (${STYLE}).`,
    },
];
const ARGUMENTS = [
    {
        selector:
            ':matches(CallExpression, NewExpression) > :matches(CallExpression, NewExpression, AwaitExpression).arguments',
        message: `Keep a call's result in a local before passing it as an argument (${STYLE}).`,
    },
];
const NAMED_EXPORTS = [
    { selector: 'ExportDefaultDeclaration', message: `Use a named export (${STYLE}).` },
];
const TYPE_STYLE = [
    { selector: 'TSEnumDeclaration', message: `Use a const object, not an enum (${STYLE}).` },
    {
        selector: 'TSTypeAliasDeclaration > TSUnionType > TSLiteralType',
        message: `Use a const object for a fixed set of values, not a union of literals (${STYLE}).`,
    },
    {
        selector: 'PropertyDefinition > PrivateIdentifier',
        message: `Use the private keyword, not # (${STYLE}).`,
    },
    {
        selector:
            'VariableDeclarator[id.name=/^[A-Z][a-z]/] > TSAsExpression > ObjectExpression > Property[key.name=/^[a-z]/]',
        message: `A const object's keys are in PascalCase (${STYLE}).`,
    },
];
/** Domain types are immutable classes made only by their static constructors (FND-73). */
const DOMAIN_CLASSES = [
    {
        selector: "ClassBody > MethodDefinition[kind='constructor'][accessibility!='private']",
        message: `A Domain class's constructor is private: make one with createNew or create (${STYLE}).`,
    },
    {
        selector: 'ClassBody > PropertyDefinition[readonly!=true][declare!=true]',
        message: `A Domain class's fields are readonly (${STYLE}).`,
    },
    {
        selector: 'TSParameterProperty[readonly!=true]',
        message: `A Domain class's fields are readonly (${STYLE}).`,
    },
];
const TEST_CALL =
    "CallExpression:matches([callee.name='it'], [callee.callee.object.name='it'], [callee.callee.property.name='each'])";
const NO_LOOPS_IN_TESTS = [
    'ForStatement',
    'ForOfStatement',
    'ForInStatement',
    'WhileStatement',
    'DoWhileStatement',
].map((loop) => ({
    selector: `${TEST_CALL} ${loop}`,
    message: `No loops in a test: use it.each (${STYLE}).`,
}));

const CONTROL_FLOW_RULES = {
    'no-param-reassign': 'error',
    'no-else-return': ['error', { allowElseIf: false }],
    'no-nested-ternary': 'error',
    complexity: ['error', 10],
    'default-case': 'error',
};

// Immutable.js collections cannot change, whatever the type checker can see of their methods.
const READ_ONLY_INPUTS = [
    'error',
    {
        allow: [
            {
                from: 'package',
                package: 'immutable',
                name: ['List', 'OrderedMap', 'Set', 'Seq', 'Range'],
            },
        ],
        checkParameterProperties: false,
        ignoreInferredTypes: true,
        treatMethodsAsReadonly: true,
    },
];

const BOOLEAN_PREFIXES = ['is', 'has', 'was', 'can', 'should', 'did'];
const NAMING = [
    {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
    },
    { selector: 'import', format: null },
    { selector: 'typeLike', format: ['PascalCase'] },
    { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
    { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
    { selector: 'variable', modifiers: ['const', 'global'], format: ['UPPER_CASE', 'PascalCase'] },
    {
        selector: 'variable',
        modifiers: ['const', 'global'],
        types: ['function'],
        format: ['camelCase'],
    },
    { selector: ['objectLiteralProperty', 'objectLiteralMethod'], format: null },
    {
        selector: ['variable', 'parameter', 'classProperty', 'typeProperty', 'accessor'],
        types: ['boolean'],
        format: ['PascalCase'],
        prefix: BOOLEAN_PREFIXES,
    },
    {
        selector: 'parameter',
        modifiers: ['unused'],
        types: ['boolean'],
        format: ['PascalCase', 'camelCase'],
        leadingUnderscore: 'allow',
    },
];

// The order of a class's members (FND-72): statics first, then fields, getters and setters, the
// constructor, and methods. Fields and accessors go private first; methods go public first.
const PRIVATE_FIRST = ['private', 'protected', 'public'];
const PUBLIC_FIRST = ['public', 'protected', 'private'];
// One rank per access level: each entry's kinds may come in any order among themselves. Nothing
// abstract is private.
const rank = (accessOrder, kinds) =>
    accessOrder.map((access) =>
        kinds
            .map((kind) => `${access}-${kind}`)
            .filter((type) => !type.startsWith('private-abstract')),
    );
const MEMBER_ORDER = [
    'signature',
    'call-signature',
    'static-initialization',
    ...rank(PRIVATE_FIRST, ['static-field']),
    ...rank(PRIVATE_FIRST, ['static-get', 'static-set']),
    ...rank(PUBLIC_FIRST, ['static-method']),
    ...rank(PRIVATE_FIRST, ['instance-field', 'abstract-field']),
    ...rank(PRIVATE_FIRST, ['instance-get', 'instance-set', 'abstract-get', 'abstract-set']),
    'constructor',
    ...rank(PUBLIC_FIRST, ['instance-method', 'abstract-method']),
];

export default defineConfig(
    {
        ignores: [
            'dist/',
            'coverage/',
            'reports/',
            'test-results/',
            'playwright-report/',
            '.stryker-tmp/',
            'docs/',
        ],
    },
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.strictTypeChecked,
            angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        languageOptions: {
            parserOptions: {
                project: './tsconfig.spec.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            ...CONTROL_FLOW_RULES,
            // A number in a message is harmless.
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            // An Angular component with no logic is an empty decorated class.
            '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
            '@typescript-eslint/explicit-function-return-type': 'error',
            // A module's commands are static methods, registered and called by reference (FND-73).
            '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
            '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
            '@typescript-eslint/explicit-member-accessibility': [
                'error',
                { accessibility: 'no-public' },
            ],
            '@typescript-eslint/naming-convention': ['error', ...NAMING],
            '@typescript-eslint/member-ordering': [
                'error',
                { default: { memberTypes: MEMBER_ORDER, order: 'as-written' } },
            ],
            'grouped-accessor-pairs': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { fixStyle: 'separate-type-imports' },
            ],
            '@typescript-eslint/consistent-type-exports': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/strict-boolean-expressions': [
                'error',
                { allowString: false, allowNumber: false, allowNullableObject: false },
            ],
            '@typescript-eslint/switch-exhaustiveness-check': [
                'error',
                { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
            ],
            'no-restricted-syntax': [
                'error',
                ...ARGUMENTS,
                ...TYPE_STYLE,
                ...FUNCTION_STYLE,
                ...NAMED_EXPORTS,
            ],
        },
    },
    {
        files: ['src/**/*.ts', 'e2e/fixtures/*.ts'],
        ignores: ['**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-magic-numbers': [
                'error',
                {
                    // 2 is for halves, squares, and doubling, which a name would only obscure.
                    ignore: [-1, 0, 1, 2],
                    ignoreArrayIndexes: true,
                    ignoreDefaultValues: true,
                    ignoreReadonlyClassProperties: true,
                    ignoreNumericLiteralTypes: true,
                },
            ],
            '@typescript-eslint/consistent-type-assertions': [
                'error',
                { assertionStyle: 'never' },
            ],
        },
    },
    {
        // Domain is strictly immutable and pure. Its types are immutable classes, each made only
        // by its static constructors (FND-73).
        files: ['src/domain/**/*.ts'],
        ignores: ['**/*.spec.ts', '**/*.testing.ts'],
        plugins: { functional },
        rules: {
            'functional/no-let': 'error',
            'functional/immutable-data': 'error',
            'no-restricted-syntax': [
                'error',
                ...ARGUMENTS,
                ...TYPE_STYLE,
                ...FUNCTION_STYLE,
                ...NAMED_EXPORTS,
                ...DOMAIN_CLASSES,
            ],
            '@typescript-eslint/prefer-readonly-parameter-types': READ_ONLY_INPUTS,
        },
    },
    {
        // Application.Core is pure like Domain. Its only classes are the abstractions that
        // Infrastructure implements, which Angular uses as injection tokens.
        files: ['src/application-core/**/*.ts'],
        ignores: ['**/*.spec.ts', '**/*.testing.ts'],
        plugins: { functional },
        rules: {
            'functional/no-let': 'error',
            'functional/no-classes': ['error', { ignoreCodePattern: '^abstract class ' }],
            'functional/immutable-data': 'error',
            '@typescript-eslint/prefer-readonly-parameter-types': READ_ONLY_INPUTS,
        },
    },
    {
        // Application coordinates. Its services may change their own fields; its data may not
        // change.
        files: ['src/application/**/*.ts'],
        ignores: ['**/*.spec.ts', '**/*.testing.ts'],
        plugins: { functional },
        rules: {
            'functional/immutable-data': ['error', { ignoreClasses: true }],
            '@typescript-eslint/prefer-readonly-parameter-types': READ_ONLY_INPUTS,
        },
    },
    {
        // The typed core (FND-72): Domain, Application.Core, and Application work only with typed
        // values, tests included. JSON is parsed, written, and checked in Infrastructure.
        files: ['src/domain/**/*.ts', 'src/application-core/**/*.ts', 'src/application/**/*.ts'],
        rules: {
            'no-restricted-properties': [
                'error',
                {
                    object: 'JSON',
                    property: 'parse',
                    message: 'Parse JSON in Infrastructure, which gives the core typed values.',
                },
                {
                    object: 'JSON',
                    property: 'stringify',
                    message:
                        'Write JSON in Infrastructure. The core compares and digests typed values.',
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['*.json', '**/json-value'],
                            message: 'JSON files and JSON values belong to Infrastructure.',
                        },
                    ],
                },
            ],
        },
    },
    {
        // The creators of branded IDs and numbers, each beside what it identifies or measures
        // (FND-83). An ID's creator sits in the file of its class.
        files: [
            'src/domain/system/records/version-chain.ts',
            'src/domain/**/numbers.ts',
            'src/domain/system/math/math.ts',
            'src/domain/map-and-routing/area-id.ts',
            'src/domain/versions/version-id.ts',
            'src/domain/business-rules/rule.ts',
            'src/domain/business-rules/parameter.ts',
            'src/domain/orders/order.ts',
            'src/domain/orders/order-event-id.ts',
            'src/domain/orders/orders-outbox-event.ts',
            'src/domain/restaurants/restaurant-place.ts',
            'src/domain/drivers/driver.ts',
            'src/domain/drivers/deliveries/order-delivery.ts',
            'src/domain/drivers/deliveries/delivery-event-id.ts',
            'src/domain/drivers/deliveries/deliveries-outbox-event.ts',
            'src/domain/drivers/deliveries/notification.ts',
            'src/application-core/simulation-engine/commit-id.ts',
            'src/application-core/simulation-engine/session-id.ts',
            'src/application-core/simulation-engine/branch-id.ts',
            'src/application-core/simulation-engine/input-names.ts',
            'src/application-core/scenarios/scripted-step.ts',
            'src/application-core/scenarios/built-in-scenarios.ts',
        ],
        rules: {
            // Only here: a branded ID or number has to be created somewhere.
            '@typescript-eslint/consistent-type-assertions': 'off',
        },
    },
    {
        files: ['**/*.spec.ts', '**/*.testing.ts'],
        rules: {
            // In a test, a wrong assumption is already a failed test.
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
    {
        files: ['src/**/*.spec.ts', 'scripts/**/*.spec.mjs'],
        plugins: { vitest },
        rules: {
            ...vitest.configs.recommended.rules,
            'vitest/no-focused-tests': 'error',
            'vitest/no-disabled-tests': 'error',
            'vitest/no-conditional-in-test': 'error',
            'vitest/no-conditional-expect': 'error',
        },
    },
    {
        files: ['src/**/*.spec.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                ...ARGUMENTS,
                ...TYPE_STYLE,
                ...FUNCTION_STYLE,
                ...NAMED_EXPORTS,
                ...NO_LOOPS_IN_TESTS,
            ],
        },
    },
    {
        files: ['src/ui/**/*.ts'],
        ignores: ['**/*.spec.ts'],
        rules: {
            '@angular-eslint/prefer-on-push-component-change-detection': 'error',
            '@angular-eslint/prefer-standalone': 'error',
            '@angular-eslint/prefer-inject': 'error',
            '@angular-eslint/prefer-signals': 'error',
            '@angular-eslint/prefer-output-readonly': 'error',
            '@angular-eslint/component-max-inline-declarations': [
                'error',
                { template: 3, styles: 3 },
            ],
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: '@angular/core',
                            importNames: ['NgModule', 'ElementRef', 'Renderer2', 'DOCUMENT'],
                            message: `No NgModule, and no direct DOM access (${STYLE}).`,
                        },
                        {
                            name: '@angular/common',
                            importNames: [
                                'NgClass',
                                'NgStyle',
                                'NgIf',
                                'NgFor',
                                'NgSwitch',
                                'DOCUMENT',
                            ],
                            message: `Use class and style bindings, and built-in control flow (${STYLE}).`,
                        },
                    ],
                },
            ],
            'no-restricted-globals': [
                'error',
                'document',
                'window',
                // Files, storage, and the network belong in Infrastructure, behind an abstraction.
                'fetch',
                'requestAnimationFrame',
                'localStorage',
                'sessionStorage',
                'indexedDB',
                'FileReader',
                'XMLHttpRequest',
                'WebSocket',
            ],
            'no-restricted-syntax': [
                'error',
                ...ARGUMENTS,
                ...TYPE_STYLE,
                ...FUNCTION_STYLE,
                ...NAMED_EXPORTS,
                {
                    selector: "CallExpression[callee.property.name='subscribe']",
                    message: `No manual subscribe in a component: use signals (${STYLE}).`,
                },
            ],
        },
    },
    {
        files: ['src/**/*.ts', 'e2e/fixtures/*.ts', 'scripts/**/*.mjs'],
        ignores: ['**/*.spec.ts', '**/*.spec.mjs'],
        plugins: { jsdoc },
        rules: {
            'jsdoc/require-jsdoc': [
                'error',
                {
                    publicOnly: true,
                    enableFixer: false,
                    require: { ClassDeclaration: true, FunctionDeclaration: true },
                    contexts: [
                        'TSInterfaceDeclaration',
                        'TSTypeAliasDeclaration',
                        'VariableDeclaration',
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
        rules: {
            '@angular-eslint/template/prefer-control-flow': 'error',
            '@angular-eslint/template/prefer-class-binding': 'error',
            '@angular-eslint/template/prefer-style-binding': 'error',
            '@angular-eslint/template/no-inline-styles': ['error', { allowBindToStyle: true }],
        },
    },
    {
        files: ['**/*.{mjs,cjs}'],
        extends: [eslint.configs.recommended],
        languageOptions: { globals: globals.node },
        rules: {
            ...CONTROL_FLOW_RULES,
            'no-magic-numbers': [
                'error',
                { ignore: [-1, 0, 1, 2], ignoreArrayIndexes: true, ignoreDefaultValues: true },
            ],
            'no-restricted-syntax': ['error', ...ARGUMENTS, ...FUNCTION_STYLE, ...NAMED_EXPORTS],
        },
    },
    {
        files: ['**/*.spec.mjs'],
        rules: {
            'no-magic-numbers': 'off',
        },
    },
    {
        // These tools require a default export, and their settings are the numbers they name.
        files: ['*.config.ts', '*.config.mjs', '.dependency-cruiser.cjs'],
        rules: {
            'no-restricted-syntax': ['error', ...ARGUMENTS, ...FUNCTION_STYLE],
            '@typescript-eslint/no-magic-numbers': 'off',
            'no-magic-numbers': 'off',
            complexity: 'off',
        },
    },
    prettier,
    {
        // After Prettier's settings, which turn this off.
        rules: { curly: ['error', 'all'] },
    },
    {
        // Prettier wraps code. This covers what it cannot, mainly comments, after its settings.
        files: ['**/*.{ts,mjs,cjs,js}'],
        rules: {
            'max-len': [
                'error',
                {
                    code: 99,
                    ignoreStrings: true,
                    ignoreTemplateLiterals: true,
                    ignoreRegExpLiterals: true,
                    ignoreUrls: true,
                    ignorePattern: String.raw`eslint-disable|^\s*(it|describe)(\.each)?[(<]`,
                },
            ],
        },
    },
);
