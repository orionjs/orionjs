import {sign} from '.'
import {describe, it, expect} from 'vitest'

describe('Sign', () => {
  it('Should create digests', () => {
    const payload = 'Hello world'
    const secret = 'secret'
    const digest = '0d5548fb7450e619b0753725068707519ed41cd212b0500bc20427e3ef66e08e'
    expect(sign.sign(payload, secret)).toEqual(digest)
  })

  it('Should create equally digests for same payloads', () => {
    const payload = 'Hello world'
    const secret = 'secret'
    expect(sign.sign(payload, secret)).toEqual(sign.sign(payload, secret))
  })

  it('Verify should return true if checksum is correct', () => {
    const payload = 'Hello world'
    const secret = 'secret'
    const checksum = '0d5548fb7450e619b0753725068707519ed41cd212b0500bc20427e3ef66e08e'
    expect(sign.verify(payload, checksum, secret)).toBe(true)
  })

  it('Verify should return false if checksum is incorrect', () => {
    const payload = 'Hello world'
    const secret = 'secret'
    const checksum = 'incorrect'
    expect(sign.verify(payload, checksum, secret)).toBe(false)
  })
})
