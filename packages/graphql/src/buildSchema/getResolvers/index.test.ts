import {beforeEach, describe, expect, it} from 'bun:test'
import {createResolver} from '@orion-js/resolvers'
import {Prop, TypedSchema} from '@orion-js/typed-model'
import getResolvers from './index'
import {clearRegisteredGraphQLTypes} from '../getType'
import {clearRegisteredGraphQLInputTypes} from '../getArgs/getField'

describe('Test get resolvers schema', () => {
  beforeEach(() => {
    clearRegisteredGraphQLTypes()
    clearRegisteredGraphQLInputTypes()
  })
  it('Should correctly build a resolvers schema using typed models', async () => {
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

    const globalResolver = createResolver({
      params: TestParams,
      returns: TestModel,
      async resolve(params) {
        params.userId
        return {
          userId: params.userId,
          name: 'test',
          age: 10,
        }
      },
    })

    const resolvers = {globalResolver}
    const mutation = false
    const options = {resolvers}
    const schema = await getResolvers(options, mutation)

    expect(schema.globalResolver.type.toString()).toEqual('TestModel')
    expect(schema.globalResolver.args).toHaveProperty('userId')
    expect(await schema.globalResolver.resolve(null, {userId: '1'}, {}, {} as any)).toEqual({
      name: 'test',
      age: 10,
    })
  })
})
