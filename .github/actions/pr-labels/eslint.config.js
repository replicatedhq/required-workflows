module.exports[
  {
    files: ['**/*.js'],
    env: {
      commonjs: true,
      es6: true,
      jest: true,
      node: true,
    },
    extends: 'eslint:recommended',
    globals: {
      Atomics: 'readonly',
      SharedArrayBuffer: 'readonly',
    },
    ignores: ['dist/'],
    parserOptions: {
      ecmaVersion: 2018,
    },
    rules: {},
  }
];
