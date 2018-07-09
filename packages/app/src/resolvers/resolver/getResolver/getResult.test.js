import getResult from './getResult'
import sleep from '../../../helpers/sleep'

it('should execute the function', async () => {
  const resolve = function({num}) {
    return num * 2
  }

  const callParams = {num: 321}
  const result = await getResult({callParams, resolve})

  expect(result).toBe(321 * 2)
})

it('should use the cache if passed', async () => {
  let index = 1
  const resolve = function() {
    index++
    return index
  }

  const cache = 10
  const resolverId = '1234'

  const result1 = await getResult({resolve, cache, resolverId})
  expect(result1).toBe(2)

  const result2 = await getResult({resolve, cache, resolverId})
  expect(result2).toBe(2)

  await sleep(12)

  const result3 = await getResult({resolve, cache, resolverId})
  expect(result3).toBe(3)
})
