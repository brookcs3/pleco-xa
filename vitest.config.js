import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,ts,mjs}'],
    setupFiles: ['./tests/setup.js']
  },
  preview: {
    allowedHosts: ['healthcheck.railway.app'],
  },
})
