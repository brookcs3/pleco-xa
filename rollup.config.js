import { terser } from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const basePlugins = [nodeResolve()];

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/pleco-xa.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [...basePlugins, terser()],
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/pleco-xa.min.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [...basePlugins, terser()],
  },
];
