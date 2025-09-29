module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/**/*'],
  rules: {
    // NestJS specific overrides
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'class-methods-use-this': 'off', // NestJS services often don't use 'this'
    'import/prefer-default-export': 'off', // NestJS uses named exports
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    
    // Decorator support
    '@typescript-eslint/parameter-properties': 'off',
    'no-param-reassign': ['error', { 'props': false }],
    
    // TypeORM specific
    'import/no-cycle': 'off', // TypeORM entities often have circular dependencies
  },
};