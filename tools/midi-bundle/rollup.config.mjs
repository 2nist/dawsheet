import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/midi-iife.js',
    format: 'iife',
    name: 'DAWSheetMidi',
    sourcemap: false
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs()
  ]
};
