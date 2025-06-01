import * as js from '@eslint/js'
import astro from 'eslint-plugin-astro'
import * as tseslint from '@typescript-eslint/eslint-plugin'

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.astro'],
    plugins: { astro },
    languageOptions: {
      parser: astro.parser,
      parserOptions: {
        extraFileExtensions: ['.astro'],
        project: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    },
  },
]