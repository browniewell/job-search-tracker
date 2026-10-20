import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.configs.recommended,
      prettier,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // ADR-0002: only the data layer may touch Dexie. And each area (src/roles,
    // src/companies, …) imports only shared modules, never another area: a
    // piece a second area needs moves to src/components or src/format.ts
    // (CODING_STANDARDS.md). One rule entry, as a second would replace this one.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['dexie', 'dexie/*'],
              message: 'Only src/data may import Dexie (ADR-0002).',
            },
            {
              group: [
                '../roles/*',
                '../companies/*',
                '../contacts/*',
                '../savedSearches/*',
                '../settings/*',
              ],
              message:
                'Areas import only shared modules: move what two areas need to src/components or src/format.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // A refused operation's message is read in one place (CODING_STANDARDS.md,
    // "Extend, don't copy"); this pattern was copied into six handlers.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/errorMessage.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ConditionalExpression > BinaryExpression.test[operator='instanceof'][right.name='Error']",
          message: 'Use errorMessage(cause) from src/errorMessage.ts.',
        },
      ],
    },
  },
  {
    // Specs add Roles, Companies and Contacts through e2e/seed.ts ("Extend,
    // don't copy"); the add-Role steps had been copied into five places.
    files: ['e2e/**/*.ts'],
    ignores: ['e2e/seed.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='getByRole'] > ObjectExpression > Property[key.name='name'][value.value=/^Add (Role|Company|Contact)$/]",
          message:
            'Add Roles, Companies and Contacts with the helpers in e2e/seed.ts.',
        },
      ],
    },
  },
])
