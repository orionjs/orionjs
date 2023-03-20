import {executeWithRetries} from './retries'

describe('Retry helpers', () => {
  it('should retry a function', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      if (counter < 3) {
        throw new Error('error')
      }
      return 'ok'
    }
    const result = await executeWithRetries(fn, 3, 0)
    expect(result).toEqual('ok')
  })

  it('should the throw the error if the retries are over', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('error')
    }
    expect.assertions(2)
    try {
      await executeWithRetries(fn, 3, 0)
    } catch (error) {
      expect(error.message).toEqual('error')
      expect(counter).toEqual(4)
    }
  })

  it('should run only once a function with 0 or undefined retrires', async () => {
    let counter = 0
    const fn = async () => {
      counter++
      throw new Error('error')
    }
    expect.assertions(2)
    try {
      await executeWithRetries(fn, null, 0)
    } catch (error) {
      expect(error.message).toEqual('error')
      expect(counter).toEqual(1)
    }
  })
})
