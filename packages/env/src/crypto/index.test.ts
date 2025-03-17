import {generateKeys, encrypt, decrypt} from '.'
import {describe, it, expect} from 'vitest'

describe('Asymetric encryption lib', () => {
  it('should generate public and private keys', async () => {
    const {decryptKey, encryptKey} = generateKeys()
    expect(decryptKey.length).toBeGreaterThan(0)
    expect(encryptKey.length).toBeGreaterThan(0)
    expect(decryptKey).not.toEqual(encryptKey)
  })

  it('should encrypt a message using the encrypt key', async () => {
    const {encryptKey} = generateKeys()
    const encrypted = encrypt(encryptKey, 'hello')
    expect(encrypted).toBeTruthy()
    expect(encrypted.length).toBeGreaterThan(0)
  })

  it('should decrypt a message using de decrypt key', async () => {
    const message = 'hello'
    const {encryptKey, decryptKey} = generateKeys()
    const encrypted = encrypt(encryptKey, message)
    const decrypted = decrypt(decryptKey, encrypted)
    expect(decrypted).toEqual(message)
  })

  it('should not produce two equal encryptions for the same message', async () => {
    const {encryptKey} = generateKeys()
    const encrypted = encrypt(encryptKey, 'hello')
    const encrypted2 = encrypt(encryptKey, 'hello')
    expect(encrypted).not.toEqual(encrypted2)
  })
})
