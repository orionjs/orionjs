import {Service, Inject} from '../../typedi'
import {TokenStorage} from './TokenStorage'
// import {getInstance, Service} from '@orion-js/services'

@Service()
export class AuthService {
  @Inject()
  private tokenStorage: TokenStorage

  login(email: string) {
    const token = `${email}-token`
    const result = this.tokenStorage.storeToken(token)
    return result
  }

  onLogin() {
    return 'loggedin'
  }
}
