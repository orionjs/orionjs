import {createModel} from '..'

it('should create correctly a model with its schema', async () => {
  const model = createModel({
    name: 'Name',
    schema: {
      services: {
        type: 'blackbox'
      }
    }
  })
})
