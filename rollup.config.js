'use strict';

var { babel } = require('@rollup/plugin-babel');
// uglify handles only es5 code, so this also acts as smoke test against shipping es2015+ syntax
//var { uglify } = require('rollup-plugin-uglify');
var pkg = require('./package.json');

var banner = '//  Isomorphory v' + pkg.version + '\n'
  + '//  Iomorphory\n'
  + '//  (c) 2022-' + new Date().getFullYear() +'\n';

var input = 'src/index.js';

var config = {
  input: input,
  output: {
    format: 'umd',
    name: 'isomorphory',
    exports: 'named',
    banner: banner
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      presets: [['@babel/preset-env']]
    })
  ]
};

module.exports = config;