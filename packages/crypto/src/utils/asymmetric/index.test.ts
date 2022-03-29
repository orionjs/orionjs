import 'reflect-metadata'
import {asymmetric} from '.'
import generatePassword from '../symmetric/generatePassword'

describe('ECDH', () => {
  it('should generate public and private keys', async () => {
    const {decryptKey, encryptKey} = asymmetric.generateKeys()
    expect(decryptKey.length).toBeGreaterThan(0)
    expect(encryptKey.length).toBeGreaterThan(0)
    expect(decryptKey).not.toEqual(encryptKey)
  })

  it('should encrypt a message using the encrypt key', async () => {
    const {encryptKey} = asymmetric.generateKeys()
    const encrypted = asymmetric.encrypt(encryptKey, 'hello')
    expect(encrypted).toBeTruthy()
    expect(encrypted.length).toBeGreaterThan(0)
  })

  it('should decrypt a message using de decrypt key', async () => {
    const message = generatePassword(100)
    const {encryptKey, decryptKey} = asymmetric.generateKeys()
    const encrypted = asymmetric.encrypt(encryptKey, message)
    const decrypted = asymmetric.decrypt(decryptKey, encrypted)
    expect(decrypted).toEqual(message)
  })

  it('should not produce two equal encryptions for the same message', async () => {
    const {encryptKey} = asymmetric.generateKeys()
    const encrypted = asymmetric.encrypt(encryptKey, 'hello')
    const encrypted2 = asymmetric.encrypt(encryptKey, 'hello')
    expect(encrypted).not.toEqual(encrypted2)
  })
})
