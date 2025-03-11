import {AuthService} from './AuthService'
import {Service, Inject} from '../../di'

@Service()
export class TokenStorage {
  @Inject(() => AuthService)
  private authService: AuthService

  storeToken(token: string) {
    const message = this.authService.onLogin()
    return `Stored token ${token} ${message}`
  }
}
