import {describe, expect, it} from 'vitest'
import {clone} from './clone'

describe('clone', () => {
  it('should return the same value for strings', () => {
    const value = 'test string'
    const result = clone(value)
    expect(result).toBe(value)
  })

  it('should return the same value for numbers', () => {
    const value = 42
    const result = clone(value)
    expect(result).toBe(value)
  })

  it('should clone objects', () => {
    const original = {a: 1, b: 2}
    const cloned = clone(original)
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
  })

  it('should clone arrays', () => {
    const original = [1, 2, 3]
    const cloned = clone(original)
    expect(cloned).toEqual(original)
    expect(cloned).not.toBe(original)
  })
})
