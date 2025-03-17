import nacl from 'tweetnacl-es6'
import {decodeUTF8, encodeUTF8, encodeBase64, decodeBase64} from './util'

const newNonce = () => nacl.randomBytes(nacl.box.nonceLength)
export const generateKeyPair = () => nacl.box.keyPair()

export const encrypt = (bSecretKey: Uint8Array, aPublicKey: Uint8Array, message: string) => {
  const nonce = newNonce()
  const messageUint8 = decodeUTF8(message)
  const encrypted = nacl.box(messageUint8, nonce, aPublicKey, bSecretKey)

  const fullMessage = new Uint8Array(nonce.length + encrypted.length)
  fullMessage.set(nonce)
  fullMessage.set(encrypted, nonce.length)

  const base64FullMessage = encodeBase64(fullMessage)
  return base64FullMessage
}

export const decrypt = (
  aSecretKey: Uint8Array,
  bPublicKey: Uint8Array,
  messageWithNonce: string,
) => {
  const messageWithNonceAsUint8Array = decodeBase64(messageWithNonce)
  const nonce = messageWithNonceAsUint8Array.slice(0, nacl.box.nonceLength)
  const message = messageWithNonceAsUint8Array.slice(nacl.box.nonceLength, messageWithNonce.length)

  const decrypted = nacl.box.open(message, nonce, bPublicKey, aSecretKey)

  if (!decrypted) {
    throw new Error('Could not decrypt message')
  }

  const base64DecryptedMessage = encodeUTF8(decrypted)
  return base64DecryptedMessage
}
