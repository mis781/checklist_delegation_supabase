import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// eslint-plugin-react isn't installed, so `no-unused-vars` has no way to see
// that a capitalized JSX tag (<MapPin />, <Foo.Bar />) references its import —
// without this, every component/icon used only in JSX is flagged as unused.
// This reimplements react/jsx-uses-vars locally to close that gap.
const local = {
  rules: {
    'jsx-uses-vars': {
      meta: { type: 'problem', schema: [] },
      create(context) {
        return {
          JSXOpeningElement(node) {
            let name = node.name
            while (name.type === 'JSXMemberExpression') name = name.object
            if (name.type === 'JSXNamespacedName') name = name.namespace
            context.sourceCode.markVariableAsUsed(name.name, node)
          },
        }
      },
    },
  },
}

export default [
  { ignores: ['dist', 'backup_inventory.js', 'scripts/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      local,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-empty': 'warn',
      'no-case-declarations': 'warn',
      'local/jsx-uses-vars': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
