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
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none' }],
      'no-redeclare': 'error',
      eqeqeq: ['error', 'smart'],
      // Writes funnel through setHtml() so the XSS surface stays greppable;
      // reads of innerHTML are fine.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AssignmentExpression > MemberExpression.left[property.name="innerHTML"]',
          message: 'Assign HTML via setHtml() from js/ui/dom.js and escape data with escapeHtml().',
        },
      ],
      'no-restricted-properties': [
        'error',
        { property: 'insertAdjacentHTML', message: 'Use setHtml() from js/ui/dom.js.' },
        { property: 'outerHTML', message: 'Use setHtml() from js/ui/dom.js.' },
      ],
    },
  },
  {
    // The one sanctioned innerHTML sink.
    files: ['js/ui/dom.js'],
    rules: { 'no-restricted-syntax': 'off' },
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
