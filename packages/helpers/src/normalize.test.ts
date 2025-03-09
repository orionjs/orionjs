import {
  removeAccentsAndTrim,
  normalizeForSearch,
  normalizeForCompactSearch,
  normalizeForFileKey,
  removeAccentsOnly,
  normalizeForSearchToken
} from './normalize'

describe('Text normalization functions', () => {
  describe('removeAccentsAndTrim', () => {
    it('should remove accents and trim whitespace', () => {
      expect(removeAccentsAndTrim('  héllô wôrld  ')).toBe('hello world')
    })

    it('should handle empty string', () => {
      expect(removeAccentsAndTrim('')).toBe('')
    })

    it('should handle null or undefined', () => {
      expect(removeAccentsAndTrim(null as any)).toBe('')
      expect(removeAccentsAndTrim(undefined as any)).toBe('')
    })

    it('should preserve case', () => {
      expect(removeAccentsAndTrim('HÉLLÔ')).toBe('HELLO')
    })
  })

  describe('normalizeForSearch', () => {
    it('should remove accents, trim whitespace, and convert to lowercase', () => {
      expect(normalizeForSearch('  HÉLLÔ WÔRLD  ')).toBe('hello world')
    })

    it('should handle empty string', () => {
      expect(normalizeForSearch('')).toBe('')
    })

    it('should handle null or undefined', () => {
      expect(normalizeForSearch(null as any)).toBe('')
      expect(normalizeForSearch(undefined as any)).toBe('')
    })
  })

  describe('normalizeForCompactSearch', () => {
    it('should remove accents, spaces, trim whitespace, and convert to lowercase', () => {
      expect(normalizeForCompactSearch('  HÉLLÔ WÔRLD  ')).toBe('helloworld')
    })

    it('should handle empty string', () => {
      expect(normalizeForCompactSearch('')).toBe('')
    })

    it('should handle null or undefined', () => {
      expect(normalizeForCompactSearch(null as any)).toBe('')
      expect(normalizeForCompactSearch(undefined as any)).toBe('')
    })

    it('should remove all types of whitespace', () => {
      expect(normalizeForCompactSearch('hello\tworld\nnew\rline')).toBe('helloworldnewline')
    })
  })

  describe('normalizeForFileKey', () => {
    it('should normalize text for file key usage', () => {
      expect(normalizeForFileKey('Héllô Wôrld!')).toBe('Hello-World')
    })

    it('should replace special characters with hyphens', () => {
      expect(normalizeForFileKey('file@name#with$special&chars')).toBe('file-name-with-special-chars')
    })

    it('should handle empty string', () => {
      expect(normalizeForFileKey('')).toBe('')
    })

    it('should handle null or undefined', () => {
      expect(normalizeForFileKey(null as any)).toBe('')
      expect(normalizeForFileKey(undefined as any)).toBe('')
    })

    it('should replace multiple consecutive hyphens with a single hyphen', () => {
      expect(normalizeForFileKey('multiple---hyphens')).toBe('multiple-hyphens')
    })

    it('should remove leading and trailing hyphens', () => {
      expect(normalizeForFileKey('-leading-and-trailing-')).toBe('leading-and-trailing')
    })

    it('should preserve periods and underscores', () => {
      expect(normalizeForFileKey('file.name_with.underscore')).toBe('file.name_with.underscore')
    })
  })

  describe('removeAccentsOnly', () => {
    it('should remove accents without trimming whitespace', () => {
      expect(removeAccentsOnly('  héllô wôrld  ')).toBe('  hello world  ')
    })

    it('should handle empty string', () => {
      expect(removeAccentsOnly('')).toBe('')
    })

    it('should handle null or undefined', () => {
      expect(removeAccentsOnly(null as any)).toBe('')
      expect(removeAccentsOnly(undefined as any)).toBe('')
    })

    it('should preserve case', () => {
      expect(removeAccentsOnly('HÉLLÔ')).toBe('HELLO')
    })
  })

  describe('normalizeForSearchToken', () => {
    it('should remove accents, trim, lowercase, and replace non-alphanumeric with spaces', () => {
      expect(normalizeForSearchToken('  HÉLLÔ-WÔRLD!  ')).toBe('hello world ')
    })

    it('should handle empty string', () => {
      expect(normalizeForSearchToken('')).toBe('')
    })

    it('should handle null or undefined', () => {
      expect(normalizeForSearchToken(null as any)).toBe('')
      expect(normalizeForSearchToken(undefined as any)).toBe('')
    })

    it('should replace all special characters with spaces', () => {
      expect(normalizeForSearchToken('hello@world#123')).toBe('hello world 123')
    })
  })

}) 