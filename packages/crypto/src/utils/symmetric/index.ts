import {getInstance, Service} from '@orion-js/services'
import symmetricDecrypt from './decrypt'
import symmetricEncrypt from './encrypt'
import generatePassword from './generatePassword'

@Service()
class Symmetric {
  generatePassword() {
    return generatePassword(32)
  }

  public encrypt = symmetricEncrypt
  public decrypt = symmetricDecrypt
}

const symmetric = getInstance(Symmetric)

export {symmetric}
