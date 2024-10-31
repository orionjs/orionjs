import {resolver} from '@orion-js/resolvers'
import {TypedModel, Prop} from '@orion-js/typed-model'
import getResolvers from './index'

describe('Test get resolvers schema', () => {
  it('Should correctly build a resolvers schema using typed models', async () => {
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

    const globalResolver = resolver({
      params: TestParams,
      returns: TestModel,
      async resolve(params: TestParams) {
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
    const schema: any = await getResolvers(options, mutation)

    expect(schema.globalResolver.type.toString()).toEqual('TestModel')
    expect(schema.globalResolver.args).toHaveProperty('userId')
    expect(await schema.globalResolver.resolve(null, {userId: '1'})).toEqual({
      userId: '1',
      name: 'test',
      age: 10,
    })
  })
})
