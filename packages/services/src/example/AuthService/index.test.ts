import 'reflect-metadata'
import {getInstance} from '../../typedi'
import {AuthService} from './AuthService'

describe('Example AuthService', () => {
  it('should create the instance and run all the methods using circular dependencies', () => {
    const auth = getInstance(AuthService)

    const result = auth.login('user@email.com')
    expect(result).toBe('Stored token user@email.com-token loggedin')
  })
})
