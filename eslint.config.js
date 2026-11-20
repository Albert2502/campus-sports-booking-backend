const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/', 'uploads/', 'docs/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      // Database columns stay snake_case (password_hash, full_name, ...).
      camelcase: ['error', { properties: 'never' }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
  prettier,
];
