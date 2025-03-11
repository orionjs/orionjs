import {getSearchTokens, getSearchQueryForTokens} from './searchTokens'
import {describe, it, expect} from 'vitest'

describe('Search Tokens Utilities', () => {
  describe('getSearchTokens', () => {
    it('should convert a simple string to tokens', () => {
      const result = getSearchTokens('Hello World')
      expect(result).toEqual(['hello', 'world'])
    })

    it('should handle empty or falsy values', () => {
      expect(getSearchTokens('')).toEqual([])
      expect(getSearchTokens(null as any)).toEqual([])
      expect(getSearchTokens(undefined as any)).toEqual([])
    })

    it('should normalize and split strings with special characters', () => {
      const result = getSearchTokens('Héllô-Wôrld! 123')
      expect(result).toEqual(['hello', 'world', '123'])
    })

    it('should process an array of strings', () => {
      const result = getSearchTokens(['Hello', 'World'])
      expect(result).toEqual(['hello', 'world'])
    })

    it('should filter out falsy values in arrays', () => {
      const result = getSearchTokens(['Hello', '', null, undefined, 'World'])
      expect(result).toEqual(['hello', 'world'])
    })

    it('should add metadata tokens when provided', () => {
      const result = getSearchTokens('Hello World', {id: '123', category: 'test'})
      expect(result).toEqual(['hello', 'world', '_id:123', '_category:test'])
    })

    it('should handle strings with multiple spaces correctly', () => {
      const result = getSearchTokens('  Hello   World  ')
      expect(result).toEqual(['hello', 'world'])
    })
  })

  describe('getSearchQueryForTokens', () => {
    it('should return empty query when no params provided', () => {
      const result = getSearchQueryForTokens()
      expect(result).toEqual({$all: []})
    })

    it('should convert filter string to RegExp tokens', () => {
      const result = getSearchQueryForTokens({filter: 'hello world'})

      expect(result.$all.length).toBe(2)
      expect(result.$all[0]).toBeInstanceOf(RegExp)
      expect(result.$all[1]).toBeInstanceOf(RegExp)

      // Test RegExp patterns
      expect((result.$all[0] as RegExp).source).toBe('^hello')
      expect((result.$all[1] as RegExp).source).toBe('^world')
    })

    it('should ignore empty filter', () => {
      const result = getSearchQueryForTokens({filter: ''})
      expect(result).toEqual({$all: []})
    })

    it('should add metadata tokens for additional parameters', () => {
      const result = getSearchQueryForTokens({
        filter: 'search',
        category: 'books',
        id: '123',
      })

      // Should have one RegExp token from filter and two metadata tokens
      expect(result.$all.length).toBe(3)
      expect(result.$all[0]).toBeInstanceOf(RegExp)
      expect(result.$all[1]).toBe('_category:books')
      expect(result.$all[2]).toBe('_id:123')
    })

    it('should ignore empty metadata values', () => {
      const result = getSearchQueryForTokens({
        category: 'books',
        author: '',
        id: '123',
      })

      expect(result.$all.length).toBe(2)
      expect(result.$all.includes('_category:books')).toBe(true)
      expect(result.$all.includes('_id:123')).toBe(true)
      expect(result.$all.includes('_author:')).toBe(false)
    })

    it('should handle complex filter with metadata', () => {
      const result = getSearchQueryForTokens({
        filter: 'Héllô Wôrld!',
        status: 'active',
      })

      expect(result.$all.length).toBe(3)

      // Check RegExp patterns
      expect((result.$all[0] as RegExp).source).toBe('^hello')
      expect((result.$all[1] as RegExp).source).toBe('^world')

      // Check metadata token
      expect(result.$all[2]).toBe('_status:active')
    })

    it('should maintain correct order with filter and metadata', () => {
      const result = getSearchQueryForTokens({
        filter: 'search term',
        category: 'books',
      })

      // Filter tokens should come first, then metadata
      expect(result.$all.length).toBe(3)
      expect(result.$all[0]).toBeInstanceOf(RegExp)
      expect(result.$all[1]).toBeInstanceOf(RegExp)
      expect(result.$all[2]).toBe('_category:books')
    })
  })
})
