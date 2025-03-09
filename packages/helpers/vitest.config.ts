import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx,js}'],
    testTimeout: 20000,
    typecheck: {
      tsconfig: './tsconfig.json',
    }
  }
})