import { defineConfig } from 'astro/config'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  site: 'https://pleco-xa.com',

  scopedStyleStrategy: 'class',

  server: {
    host: true,
    port: 3000,
  },

  build: {
    output: 'static',
    assets: 'assets',
  },

  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use 'sass:math'; @use 'sass:map'; @use "@/styles/import" as *;`,
        },
      },
    },
    build: {
      assetsInlineLimit: 0,
    },
  },

  devToolbar: {
    enabled: true,
  },
})
