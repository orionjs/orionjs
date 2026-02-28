import getResult from './getResult'

it('should execute the function', async () => {
  const resolve = async ({num}: {num: number}) => num * 2

  const params = {num: 321}
  const result = await getResult({
    options: {resolve},
    params,
    viewer: {},
    info: undefined,
  })

  expect(result).toBe(321 * 2)
})
