import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from '@rollup/plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/pleco-xa.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/pleco-xa.min.js',
      format: 'esm',
      plugins: [terser()],
      sourcemap: true
    }
  ],
  plugins: [nodeResolve()]
};
