import buble from 'rollup-plugin-buble';
// import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'src/list.js',
  plugins: [
    buble(),
    // uglify()
  ],

  targets: [
    { dest: 'dist/list.cjs.js', format: 'cjs' },
    { dest: 'dist/list.es6.js', format: 'es6' }
  ]
};
