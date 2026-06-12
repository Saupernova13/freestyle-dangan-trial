import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Catches any global reference left behind by the ES-module conversion.
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-redeclare': 'error',
      eqeqeq: ['warn', 'smart'],
    },
  },
  {
    files: ['tests/**/*.js', 'vite.config.js', 'vitest.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
];
