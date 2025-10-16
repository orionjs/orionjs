import {logger} from '@orion-js/logger'
import config from '../config'
import {internalGetEnv} from '@orion-js/env'

export function getEchoesPassword() {
  const secret = config?.requests?.key || internalGetEnv('echoes_password', 'ECHOES_PASSWORD')
  if (!secret) {
    logger.warn(
      'Warning: no secret key found for echoes requests. Init echoes or set the env var "echoes_password" or process.env.ECHOES_PASSWORD',
    )
  }

  return secret
}
