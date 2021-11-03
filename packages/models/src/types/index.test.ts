import {createModel} from '..'

it('should create correctly a model with its schema', async () => {
  const model1 = createModel({
    name: 'Name',
    schema: {
      services: {
        type: 'blackbox'
      }
    }
  })
  const model2 = createModel({
    name: 'Name',
    schema: {
      services: {
        type: model1,
        private: true
      }
    }
  })

  const model3 = createModel({
    name: 'Name',
    schema: {
      services: {
        type: [model2],
        optional: true
      }
    }
  })
})
