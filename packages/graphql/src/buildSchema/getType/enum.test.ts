import {resolver} from '@orion-js/resolvers'
import {getModelForClass, Prop, TypedSchema} from '@orion-js/typed-model'
import getResolvers from '../getResolvers'
import {createEnum} from '@orion-js/schema'

describe('Enum test', () => {
  it('Should create correctly enum types', async () => {
    const colorsEnum = createEnum('ColorsEnum', ['red', 'blue', 'green'])
    type enumType = 'red' | 'blue' | 'green'

    @TypedSchema()
    class TestParams {
      @Prop({type: colorsEnum})
      color: enumType
    }

    const globalResolver = resolver({
      params: TestParams,
      returns: colorsEnum,
      async resolve(params: TestParams): Promise<enumType> {
        return params.color
      }
    })

    const resolvers = {globalResolver}
    const mutation = false
    const options = {resolvers}
    const schema: any = await getResolvers(options, false)

    expect(schema.globalResolver.args).toHaveProperty('color')
    expect(schema.globalResolver.args.color.type.toString()).toEqual('ColorsEnum')
    expect(schema.globalResolver.type.toString()).toEqual('ColorsEnum')
    expect(await schema.globalResolver.resolve(null, {color: 'red'})).toEqual('red')
  })
})
