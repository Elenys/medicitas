import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Reglas derivadas del documento de estándares de codificación (especificacion/07, §6).
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'max-params': ['error', 3],
      'max-depth': ['error', 3],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Un componente de React es una función; el estándar le concede 150 líneas.
    files: ['src/components/**/*.tsx', 'src/app/**/*.tsx'],
    rules: { 'max-lines-per-function': ['error', { max: 150, skipBlankLines: true }] },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts'],
    rules: {
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['src/**/*.test.ts', 'tests/**/*.ts', 'prisma/seed.ts', 'scripts/**/*.ts'],
    rules: { 'max-params': 'off', 'max-lines-per-function': 'off', 'no-console': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'prisma/migrations/**']),
]);

export default eslintConfig;
