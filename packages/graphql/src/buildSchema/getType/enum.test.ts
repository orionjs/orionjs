import {resolver} from '@orion-js/resolvers'
import {cloneSchemaClass, getModelForClass, Prop, TypedSchema} from '@orion-js/typed-model'
import getResolvers from '../getResolvers'
import {createEnum} from '@orion-js/schema'
import buildSchema from '..'

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

  it('Should use the reference for duplicated enums', async () => {
    const colorsEnum = createEnum('ColorsEnum', ['red', 'blue', 'green'])
    type enumType = 'red' | 'blue' | 'green'

    @TypedSchema()
    class TestParams {
      @Prop({type: colorsEnum})
      color: enumType
    }

    const Clone1 = cloneSchemaClass(TestParams, {name: 'TestParams2', pickFields: ['color']})

    const globalResolver = resolver({
      params: TestParams,
      returns: Clone1,
      async resolve(params: TestParams): Promise<typeof Clone1> {
        return params
      }
    })

    const Clone2 = cloneSchemaClass(TestParams, {name: 'TestParams3', pickFields: ['color']})
    const Clone3 = cloneSchemaClass(TestParams, {name: 'TestParams4', pickFields: ['color']})

    const globalResolver2 = resolver({
      params: Clone2,
      returns: Clone3,
      async resolve(params: TestParams): Promise<typeof Clone3> {
        return params
      }
    })

    const resolvers = {globalResolver, globalResolver2}
    const options = {resolvers}
    await buildSchema(options)
  })
})
