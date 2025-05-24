import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from '@rollup/plugin-terser';

const basePlugins = [nodeResolve()];

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/pleco-xa.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: basePlugins,
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
