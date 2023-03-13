module.exports = {
  'extends': ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  'parser': '@typescript-eslint/parser',
  'plugins': ['@typescript-eslint'],
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    },
    'env': {
      'browser': false,
      'node': true,
      'es6': true,
      'amd': false,
      'mocha': true
    },
    // the base configuration
    'globals': {
      '__rewire_reset_all__': 'readonly'
    },
    'rules': {
      'array-callback-return': 'error',
      'brace-style': ['error', '1tbs', {'allowSingleLine': false}],
      'camelcase': ['error', {'properties': 'always'}],
      'complexity': ['error', 5],
      'consistent-return': 'error',
      'curly': ['error', 'all'],
      'global-require': 'error',
      'handle-callback-err': ['error', '^.*(e|E)rr'],
      'init-declarations': ['error', 'always'],
      'linebreak-style': ['error', 'unix'],
      'newline-per-chained-call': ['error', { 'ignoreChainWithDepth': 3 }],
      'no-console': 'off',
      'no-eq-null': 'error',
      'prefer-const': 'error',
      'no-lonely-if': 'error',
      'no-mixed-requires': ['error', {'grouping': true}],
      'no-throw-literal': 'error',
      'no-undef-init': 'error',
      'no-undefined': 'error',
      'no-var': 'error',
      'no-unused-expressions': ['error', { 'allowShortCircuit': true, 'allowTernary': true }],
      'no-unused-vars': ['error', {'vars': 'all', 'args': 'none'}],
      'no-void': 'error',
      'no-with': 'error',
      'prefer-promise-reject-errors': 'error',
      'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
      'semi': ['error', 'always'],
      'space-unary-ops': ['error', {'words': true, 'nonwords': false}],
      'strict': ['error', 'never'],
      'valid-jsdoc': ['error'],
    }
  };
  