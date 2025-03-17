import {defineConfig} from 'vitest/config'

export default defineConfig({
  esbuild: {
    target: 'es2022',
  },
  test: {
    includeTaskLocation: true,
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    hookTimeout: 5000,
    testTimeout: 5000,
  },
})
