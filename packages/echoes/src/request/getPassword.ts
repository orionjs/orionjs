import config from '../config'
import {getEchoesLogger} from '../runtime'

export function getEchoesPassword() {
  const secret = config?.requests?.key || process.env.echoes_password || process.env.ECHOES_PASSWORD
  if (!secret) {
    getEchoesLogger().warn(
      'Warning: no secret key found for echoes requests. Init echoes or set the env var "echoes_password" or process.env.ECHOES_PASSWORD',
    )
  }

  return secret
}
