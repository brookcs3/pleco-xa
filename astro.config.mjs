import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  publicDir: 'public',
  outDir: 'dist',
  server: {
    port: 3000,
    host: true
  },
  build: {
    assets: 'assets'
  }
});