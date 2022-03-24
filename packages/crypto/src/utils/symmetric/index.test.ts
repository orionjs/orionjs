import 'reflect-metadata'
import {symmetric} from '.'

describe('Symmetric', () => {
  it('should de able to encrypt a decrypt texts', () => {
    const text = 'hello world'
    const password = symmetric.generatePassword()
    const encrypted = symmetric.encrypt(text, password)
    const decrypted = symmetric.decrypt(encrypted, password)
    expect(decrypted).toEqual(text)
  })
})
