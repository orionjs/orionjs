import {Service, Inject} from '../../di'
import {TokenStorage} from './TokenStorage'

@Service()
export class AuthService {
  @Inject(() => TokenStorage)
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
