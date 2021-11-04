import {TypedModel, Prop} from '@orion-js/typed-model'
import {subscription} from '../..'
import getSubscriptions from './index'

describe('Test get subscriptions schema', () => {
  it('Should correctly build a subscriptions schema using typed models', async () => {
    @TypedModel()
    class TestParams {
      @Prop()
      userId: string
    }

    @TypedModel()
    class TestModel {
      @Prop()
      name: string

      @Prop()
      age: number
    }

    const modelSub = subscription<TestParams, TestModel>({
      params: TestParams,
      returns: TestModel
    })

    const subscriptions = {modelSub}
    const options = {}
    const schema: any = await getSubscriptions({subscriptions, options})

    expect(schema.modelSub.type.toString()).toEqual('TestModel')
    expect(schema.modelSub.args).toHaveProperty('userId')
  })
})
