import algorithm from './algorithm'
import crypto from 'crypto'

export default function symmetricEncrypt(text: string, password: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, password, iv)
  const encrypted = cipher.update(text)
  const finalBuffer = Buffer.concat([encrypted, cipher.final()])
  return iv.toString('hex') + ':' + finalBuffer.toString('hex')
}
