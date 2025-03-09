import { OrionError, OrionErrorInformation } from './OrionError'

// Since OrionError is an abstract class with unimplemented methods,
// we'll create a concrete implementation for testing
class TestOrionError extends OrionError {
  constructor(message: string, code: string = 'test_error', extra: any = {}) {
    super(message)
    this.code = code
    this.extra = extra
    this.isUserError = false
    this.isPermissionsError = false

    this.getInfo = (): OrionErrorInformation => {
      return {
        error: this.code,
        message: this.message,
        extra: this.extra
      }
    }
  }
}

describe('OrionError', () => {
  it('should be an instance of Error', () => {
    const error = new TestOrionError('Test error message')
    expect(error).toBeInstanceOf(Error)
  })

  it('should have OrionError properties', () => {
    const error = new TestOrionError('Test error message')
    expect(error.isOrionError).toBe(true)
    expect(error.isUserError).toBe(false)
    expect(error.isPermissionsError).toBe(false)
    expect(error.code).toBe('test_error')
    expect(error.message).toBe('Test error message')
  })

  it('should have a getInfo method that returns the correct structure', () => {
    const extraData = { userId: '123', context: 'testing' }
    const error = new TestOrionError('Test error message', 'custom_code', extraData)

    const info = error.getInfo()
    expect(info).toEqual({
      error: 'custom_code',
      message: 'Test error message',
      extra: extraData
    })
  })

  it('should be extendable with custom properties', () => {
    const error = new TestOrionError('Test error message') as any
    error.customProp = 'custom value'

    expect(error.customProp).toBe('custom value')
    expect(error.message).toBe('Test error message')
    expect(error.isOrionError).toBe(true)
  })
}) 