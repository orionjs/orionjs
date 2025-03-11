import {describe, it, expect} from 'vitest'
import {sendEmail} from './index'

describe('Mailing Package', () => {
  it('should export the sendEmail function', () => {
    expect(sendEmail).toBeDefined()
    expect(typeof sendEmail).toBe('function')
  })
})
