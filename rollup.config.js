import { nodeResolve } from '@rollup/plugin-node-resolve';
import { minify } from 'terser';

const basePlugins = [nodeResolve()];

// Custom Terser plugin using the bundled 'terser' package
const terserPlugin = {
  name: 'custom-terser',
  async renderChunk(code) {
    const result = await minify(code, { sourceMap: true });
    return { code: result.code || '', map: result.map };
  }
};

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/pleco-xa.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [...basePlugins],
  },
  {
    input: 'src/index.js',
    output: {
      file: 'dist/pleco-xa.min.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [...basePlugins, terserPlugin],
  },
];
