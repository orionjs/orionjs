import createModel from './index'
import {sleep} from '@orion-js/helpers'
import {modelResolver, resolver} from '@orion-js/resolvers'

it('should call the resolver', async () => {
  let index = 0
  const model = createModel({
    name: 'AModel',
    schema: {},
    resolvers: {
      res: modelResolver({
        private: true,
        cache: 100,
        async resolve() {
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

  await sleep(100)

  expect(await item.res({p: 1})).toBe(3)
})

it('should call the custom clean function if present', async () => {
  const AModel = createModel({
    name: 'AModel',
    schema: {
      someValue: {
        type: String
      }
    },
    clean: doc => ({someValue: 'hello world'})
  })

  const aResolver = resolver({
    params: {
      model: {
        type: AModel
      }
    },
    resolve: ({model}) => {
      return model
    }
  })

  const doc = AModel.initItem({someValue: 'hello'})
  const result = await aResolver.resolve({model: doc})
  expect(result.someValue).toBe('hello world')
})
