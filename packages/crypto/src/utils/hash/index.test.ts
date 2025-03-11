import {hash} from '.'
import {describe, it, expect} from 'vitest'

describe('Hash with salt', () => {
  // should hash a password
  it('Should hash a password', async () => {
    const password = 'password'
    const hashed = hash.hash(password)
    expect(typeof hashed).toBe('string')
  })

  // should compare a password to a hash
  it('Should compare a password to a hash', async () => {
    const password = 'password'
    const hashed = hash.hash(password)
    expect(hash.compare(password, hashed)).toBe(true)
  })

  it('Should return false when password is not the same', async () => {
    const password = 'password1'
    const hashed = hash.hash(password)
    expect(hash.compare('password2', hashed)).toBe(false)
  })
})
