import {beforeEach, describe, expect, it} from 'bun:test'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import {subscription} from '../..'
import getSubscriptions from './index'
import {clearRegisteredGraphQLTypes} from '../getType'
import {clearRegisteredGraphQLInputTypes} from '../getArgs/getField'

describe('Test get subscriptions schema', () => {
  beforeEach(() => {
    clearRegisteredGraphQLTypes()
    clearRegisteredGraphQLInputTypes()
  })
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
