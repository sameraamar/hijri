import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Context providers legitimately co-locate Provider + hook.
      // We accept the HMR cost for the simpler architecture.
      'react-refresh/only-export-components': 'off',
      // React Compiler hint; not a bug, just an optimization opportunity.
      // We don't currently use React Compiler.
      'react-hooks/preserve-manual-memoization': 'off',
      // Closing the popover on month/year change is a deliberate UX behavior,
      // not state-derivation. The rule is too strict for this pattern.
      'react-hooks/set-state-in-effect': 'off',
      // `any` is mostly intentional at engine boundaries; warn rather than block.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);
