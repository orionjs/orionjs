import {
  isOrionError,
  isUserError,
  isPermissionsError,
  OrionError,
  UserError,
  PermissionsError
} from './index'

describe('Error type guards', () => {
  // Mock concrete implementation of OrionError for testing
  class TestOrionError extends OrionError {
    constructor() {
      super('Test error')
      this.code = 'test_error'
      this.extra = {}
      this.isOrionError = true
      this.isUserError = false
      this.isPermissionsError = false

      this.getInfo = () => ({
        error: this.code,
        message: this.message,
        extra: this.extra
      })
    }
  }

  describe('isOrionError', () => {
    it('should return true for OrionError instances', () => {
      expect(isOrionError(new TestOrionError())).toBe(true)
      expect(isOrionError(new UserError('test'))).toBe(true)
      expect(isOrionError(new PermissionsError('test'))).toBe(true)
    })

    it('should return false for non-OrionError objects', () => {
      expect(isOrionError(new Error('Regular error'))).toBe(false)
      expect(isOrionError({ message: 'Not an error' })).toBe(false)
      expect(isOrionError(null)).toBe(false)
      expect(isOrionError(undefined)).toBe(false)
    })
  })

  describe('isUserError', () => {
    it('should return true for UserError instances', () => {
      expect(isUserError(new UserError('test'))).toBe(true)
    })

    it('should return false for other error types', () => {
      expect(isUserError(new TestOrionError())).toBe(false)
      expect(isUserError(new PermissionsError('test'))).toBe(false)
      expect(isUserError(new Error('Regular error'))).toBe(false)
      expect(isUserError(null)).toBe(false)
    })
  })

  describe('isPermissionsError', () => {
    it('should return true for PermissionsError instances', () => {
      expect(isPermissionsError(new PermissionsError('test'))).toBe(true)
    })

    it('should return false for other error types', () => {
      expect(isPermissionsError(new TestOrionError())).toBe(false)
      expect(isPermissionsError(new UserError('test'))).toBe(false)
      expect(isPermissionsError(new Error('Regular error'))).toBe(false)
      expect(isPermissionsError(null)).toBe(false)
    })
  })
}) 