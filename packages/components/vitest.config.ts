import {defineConfig} from 'vitest/config'

export default defineConfig({
  esbuild: {
    target: 'es2022',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./setup-tests.ts'],
    hookTimeout: 3000,
    testTimeout: 3000,
    fileParallelism: false,
    maxConcurrency: 1,
  },
})
