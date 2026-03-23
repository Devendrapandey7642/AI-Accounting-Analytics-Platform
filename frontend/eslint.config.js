import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const appGlobals = {
  Blob: 'readonly',
  File: 'readonly',
  FormData: 'readonly',
  HTMLElement: 'readonly',
  HTMLDivElement: 'readonly',
  HTMLInputElement: 'readonly',
  Intl: 'readonly',
  KeyboardEvent: 'readonly',
  SVGSVGElement: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  XMLSerializer: 'readonly',
  console: 'readonly',
  document: 'readonly',
  localStorage: 'readonly',
  navigator: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  window: 'readonly',
}

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: appGlobals,
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]
