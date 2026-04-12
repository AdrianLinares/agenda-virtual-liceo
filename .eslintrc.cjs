module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Keep no-explicit-any as warn for now to allow gradual fixes across repo
    '@typescript-eslint/no-explicit-any': 'warn',
    // react-hooks/exhaustive-deps is recommended but causes many warnings; keep as warn
    'react-hooks/exhaustive-deps': 'warn',
  },
}
