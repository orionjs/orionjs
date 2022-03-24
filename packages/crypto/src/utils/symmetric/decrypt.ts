import algorithm from './algorithm'
import crypto from 'crypto'

export default function symmetricDecrypt(text: string, password: string) {
  const encryptedArray = text.split(':')
  if (!encryptedArray[1]) {
    throw new Error('IV is missing in hash')
  }
  const iv = Buffer.from(encryptedArray[0], 'hex')
  const encrypted = Buffer.from(encryptedArray[1], 'hex')
  const decipher = crypto.createDecipheriv(algorithm, password, iv)
  const decrypted = decipher.update(encrypted)
  return Buffer.concat([decrypted, decipher.final()]).toString()
}
