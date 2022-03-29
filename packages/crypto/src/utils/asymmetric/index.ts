import {getInstance} from '@orion-js/services'
import {Service} from '@orion-js/services'
import {generateKeyPair, encrypt, decrypt} from './tweetnacl'
import {encodeBase64, decodeBase64} from 'tweetnacl-util'

@Service()
class Asymmetric {
  generateKeys() {
    const {publicKey, secretKey} = generateKeyPair()

    const encryptKeyHex = encodeBase64(publicKey)
    const decryptKeyHex = encodeBase64(secretKey)

    return {
      encryptKey: encryptKeyHex,
      decryptKey: decryptKeyHex
    }
  }

  /**
   * Creates a temporal keypair just to encrypt one message.
   * Saves the public key in the result so that the message can be decrypted.
   */
  encrypt(encryptKey: string, message: string) {
    const encryptPublicKey = decodeBase64(encryptKey)
    const tempPair = generateKeyPair()
    const encrypted = encrypt(tempPair.secretKey, encryptPublicKey, message)
    const hexTempPublic = encodeBase64(tempPair.publicKey)
    return `${hexTempPublic}:${encrypted}`
  }

  /**
   * Ecrypts a message using the decrypt key
   */
  decrypt(decryptKey: string, encrypted: string) {
    const decryptSecretKey = decodeBase64(decryptKey)
    const [messagePubKeyHex, encryptedMessage] = encrypted.split(':')
    const messagePubKey = decodeBase64(messagePubKeyHex)

    return decrypt(decryptSecretKey, messagePubKey, encryptedMessage)
  }
}

const asymmetric = getInstance(Asymmetric)

export {asymmetric}
