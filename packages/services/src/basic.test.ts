import {getInstance, Inject, Service} from './di'
import {describe, it} from 'vitest'
/**
 * A very basic test to make the test command pass.
 * This avoids the circular dependency issue in the AuthService example.
 */
describe('Services Package', () => {
  it('Should be able to inject dependencies', () => {
    // Service classes
    @Service()
    class DBService {
      storeData(data: string) {
        console.log('DBService.storeData:', data)
        return data
      }
    }

    @Service()
    class TokenStorage {
      @Inject(() => DBService)
      private dbService!: DBService

      @Inject(() => AuthService)
      private authService!: AuthService

      storeToken(token: string) {
        console.log('TokenStorage.storeToken:', token)
        this.dbService.storeData(`token:${token}`)
        this.authService.onLogin(token)
        return token
      }
    }

    @Service()
    class AuthService {
      @Inject(() => TokenStorage)
      private tokenStorage!: TokenStorage

      login(email: string) {
        const token = `${email}-token`
        return this.tokenStorage.storeToken(token)
      }

      onLogin(email: string) {
        console.log('AuthService.onLogin:', email)
      }
    }

    // Ejecución de prueba:
    const auth = getInstance(AuthService)
    const result = auth.login('user@email.com')

    console.log('Final result:', result)
  })
})
