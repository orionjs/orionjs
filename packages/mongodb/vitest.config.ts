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
    setupFiles: ['./setup-tests.ts'],
    testTimeout: 2000,
    fileParallelism: process.env.CI !== 'true', // Disable parallelism in CI to avoid Github Actions error with mongodb-memory-server
  },
})
