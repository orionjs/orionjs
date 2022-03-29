import {asymmetric} from '@orion-js/crypto'
import {Config} from './getConfig'

export const encryptValue = (key: string, value: string, config: Config) => {
  if (key.startsWith('_')) {
    const newKey = key.replace(/^_/, '')
    config.cleanKeys[newKey] = value
    return
  }
  config.encryptedKeys[key] = asymmetric.encrypt(config.publicKey, value)
}
