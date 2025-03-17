import {symmetric} from '.'
import {describe, it, expect} from 'vitest'

describe('Symmetric', () => {
  it('should de able to encrypt a decrypt texts', () => {
    const text = 'hello world'
    const password = symmetric.generatePassword()
    const encrypted = symmetric.encrypt(text, password)
    const decrypted = symmetric.decrypt(encrypted, password)
    expect(decrypted).toEqual(text)
  })
})
