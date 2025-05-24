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

