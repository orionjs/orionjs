import {defineConfig} from 'vitest/config'

console.log('CI VALUE:', process.env.CI)
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
    fileParallelism: process.env.CI !== 'true',
  },
})
