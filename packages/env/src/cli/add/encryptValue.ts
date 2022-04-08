import {encrypt} from '../../crypto'
import {Config} from '../../environment/getVariables'

export const encryptValue = (key: string, value: string, config: Config) => {
  config.encryptedKeys[key] = encrypt(config.publicKey, value)
}
