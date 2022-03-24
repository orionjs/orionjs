import {generateId} from '@orion-js/helpers'
import {getInstance, Service} from '@orion-js/services'
import symmetricDecrypt from './decrypt'
import symmetricEncrypt from './encrypt'

@Service()
class Symmetric {
  generatePassword() {
    return generateId(32)
  }

  public encrypt = symmetricEncrypt
  public decrypt = symmetricDecrypt
}

const symmetric = getInstance(Symmetric)

export {symmetric}
