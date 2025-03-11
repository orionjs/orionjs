import {AuthService} from './AuthService'
import {Service, Inject} from '../../di'

export
@Service()
class TokenStorage {
  @Inject(() => AuthService)
  private authService: AuthService

  storeToken(token: string) {
    const message = this.authService.onLogin()
    return `Stored token ${token} ${message}`
  }
}
