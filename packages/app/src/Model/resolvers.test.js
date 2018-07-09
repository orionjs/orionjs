import Model from './index'
import {resolver} from '../resolvers'

it('should call the resolver', async () => {
  let index = 0
  const model = new Model({
    name: 'AModel',
    resolvers: {
      res: resolver({
        private: true,
        cache: 1000,
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
  await item.res.invalidateCache({p: 1})
  expect(await item.res({p: 1})).toBe(3)
  expect(await item.res({p: 2})).toBe(2)
})
