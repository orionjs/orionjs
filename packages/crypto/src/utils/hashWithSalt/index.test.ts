import {hashWithSalt} from '.'
import {describe, it, expect} from 'vitest'

describe('Hash with salt', () => {
  // should hash a password
  it('Should hash a password', async () => {
    const password = 'password'
    const hash = hashWithSalt.hash(password)
    expect(typeof hash).toBe('string')
  })

  // should compare a password to a hash
  it('Should compare a password to a hash', async () => {
    const password = 'password'
    const hash = hashWithSalt.hash(password)
    expect(hashWithSalt.compare(password, hash)).toBe(true)
  })
})
