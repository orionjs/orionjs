import createModel from './index'
import resolver from '../resolver'
import {sleep} from '@orion-js/helpers'

it('should call the resolver', async () => {
  let index = 0
  const model = createModel({
    name: 'AModel',
    schema: {},
    resolvers: {
      res: resolver({
        private: true,
        cache: 5,
        async resolve(item, params, viewer) {
          index++
          return index
        }
      })
    }
  })

  const item = model.initItem({index: 0})
  expect(await item.res({p: 1})).toBe(1)
  expect(await item.res({p: 2})).toBe(2)
  expect(await item.res({p: 1})).toBe(1)

  await sleep(5)

  expect(await item.res({p: 1})).toBe(3)
})
