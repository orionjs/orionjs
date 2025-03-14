import {describe, expect, it} from 'vitest'
import version from './version'

/**
 * This is a simple test file to ensure the tests run for the core package.
 */
describe('Core Package', () => {
  it('should export a version', () => {
    expect(version).toBeDefined()
    expect(typeof version).toBe('string')
  })
})
