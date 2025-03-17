// import {InferSchemaType} from '@orion-js/schema'
import {createModel} from '..'
import {it} from 'vitest'

it('should create correctly a model with its schema', async () => {
  const model1 = createModel({
    name: 'Name',
    schema: {
      services: {
        type: 'blackbox',
      },
    },
  })
  const model2 = createModel({
    name: 'Name',
    schema: {
      services: {
        type: model1,
        private: true,
      },
    },
  })

  const model3 = createModel({
    name: 'Name',
    schema: {
      services: {
        type: [model2],
        optional: true,
      },
    },
  })

  const model4 = createModel<{name: string}>({
    name: 'Name',
    schema: {},
  })
  type Model4 = typeof model4.type
})

// const schema = {
//   name: {
//     type: 'string'
//   }
// } as const

// const model = createModel({
//   name: 'Name',
//   schema
// })

// type Item = InferSchemaType<typeof model>

// const itemType: Item = {
//   news: 'dafs',
//   name: 1
// }
