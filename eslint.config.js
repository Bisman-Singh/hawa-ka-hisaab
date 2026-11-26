// Lint rules: strict type-checked TypeScript, React and accessibility rules, and the size limits for source.
import { defineConfig } from 'eslint/config';
import { builtinRules } from 'eslint/use-at-your-own-risk';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const coreRecommended = Object.fromEntries(
  [...builtinRules]
    .filter(([, rule]) => rule.meta?.docs?.recommended === true)
    .map(([name]) => [name, 'error']),
);

const lineOptions = { skipBlankLines: true, skipComments: true };

const bannedSyntax = [
  {
    selector: 'TSAsExpression',
    message: 'Type assertions are not allowed. Narrow with a schema or a check.',
  },
  {
    selector: 'TSTypeAssertion',
    message: 'Type assertions are not allowed. Narrow with a schema or a check.',
  },
  {
    selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
    message: 'Write text, never HTML.',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'Write text, never HTML.',
  },
];

export default defineConfig(
  {
    ignores: ['dist/', 'coverage/', 'node_modules/', 'playwright-report/', 'test-results/', '.vitest/'],
  },
  {
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
  },
  { rules: coreRecommended },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-restricted-syntax': ['error', ...bannedSyntax],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx', 'hack'], location: 'anywhere' }],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-param-reassign': 'error',
      complexity: ['error', 8],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'max-lines': ['error', { max: 120, ...lineOptions }],
      'max-lines-per-function': ['error', { max: 30, ...lineOptions, IIFEs: true }],
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    settings: { react: { version: '19.3' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      'react/no-danger': 'error',
      'react/prop-types': 'off',
      'max-lines-per-function': ['error', { max: 50, ...lineOptions, IIFEs: true }],
    },
  },
  {
    files: ['src/lib/logger.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['test/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off' },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
