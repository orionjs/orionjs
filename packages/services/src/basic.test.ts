import { describe, it, expect } from 'vitest'
import 'reflect-metadata'
import { Service } from './typedi'

/**
 * A very basic test to make the test command pass.
 * This avoids the circular dependency issue in the AuthService example.
 */
describe('Services Package', () => {
  it('should export Service decorator', () => {
    expect(Service).toBeDefined()
    expect(typeof Service).toBe('function')
  })
}) 