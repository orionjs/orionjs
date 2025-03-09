import UserError from './UserError'
import { OrionError } from './OrionError'

describe('UserError', () => {
  it('should extend OrionError', () => {
    const error = new UserError('test_code', 'Test error message')
    expect(error).toBeInstanceOf(OrionError)
  })

  it('should set isUserError to true', () => {
    const error = new UserError('test_code', 'Test error message')
    expect(error.isUserError).toBe(true)
    expect(error.isOrionError).toBe(true)
    expect(error.isPermissionsError).toBeUndefined()
  })

  it('should set code and message correctly', () => {
    const error = new UserError('test_code', 'Test error message')
    expect(error.code).toBe('test_code')
    expect(error.message).toBe('Test error message')
  })

  it('should support providing only a message (code defaults to "error")', () => {
    const error = new UserError('Test error message')
    expect(error.code).toBe('error')
    expect(error.message).toBe('Test error message')
  })

  it('should support extra data', () => {
    const extraData = { field: 'username', constraint: 'required' }
    const error = new UserError('validation_error', 'Validation failed', extraData)

    expect(error.extra).toEqual(extraData)
  })

  it('should have a getInfo method that returns the correct structure', () => {
    const extraData = { field: 'email', constraint: 'format' }
    const error = new UserError('invalid_email', 'Invalid email format', extraData)

    const info = error.getInfo()
    expect(info).toEqual({
      error: 'invalid_email',
      message: 'Invalid email format',
      extra: extraData
    })
  })

  it('should have proper stack trace', () => {
    const error = new UserError('test_code', 'Test error message')
    expect(error.stack).toBeDefined()
    expect(error.stack.includes('UserError.test.ts')).toBe(true)
  })
}) 