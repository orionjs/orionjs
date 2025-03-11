import {getInstance} from '../../di'
import {AuthService} from './AuthService'
import {describe, it, expect} from 'vitest'

describe('Example AuthService', () => {
  it('should create the instance and run all the methods using circular dependencies', () => {
    const auth = getInstance(AuthService)

    const result = auth.login('user@email.com')
    expect(result).toBe('Stored token user@email.com-token loggedin')

    expect(true).toBe(true)
  })
})
