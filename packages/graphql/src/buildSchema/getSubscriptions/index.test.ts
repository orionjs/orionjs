import {TypedSchema, Prop} from '@orion-js/typed-model'
import {subscription} from '../..'
import getSubscriptions from './index'
import {describe, it, expect} from 'vitest'

describe('Test get subscriptions schema', () => {
  it('Should correctly build a subscriptions schema using typed models', async () => {
    @TypedSchema()
    class TestParams {
      @Prop({type: String})
      userId: string
    }

    @TypedSchema()
    class TestModel {
      @Prop({type: String})
      name: string

      @Prop({type: Number})
      age: number
    }

    const modelSub = subscription<TestParams, TestModel>({
      params: TestParams,
      returns: TestModel,
    })

    const subscriptions = {modelSub}
    const options = {subscriptions, resolvers: {}}
    const schema: any = await getSubscriptions(options)

    expect(schema.modelSub.type.toString()).toEqual('TestModel')
    expect(schema.modelSub.args).toHaveProperty('userId')
  })
})
