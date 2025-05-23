import {createModelResolver, createResolver} from '@orion-js/resolvers'
import buildSchema from '..'
import {describe, expect, it} from 'vitest'
import {schemaWithName} from '@orion-js/schema'

describe('Enum test', () => {
  it('Should create correctly types when using schemas (not models)', async () => {
    const schemaInput = schemaWithName('Input', {
      query: {
        type: 'string',
      },
    })

    const schemaResult = schemaWithName('Result', {
      results: {
        type: ['string'],
      },
    })

    const globalResolver = createResolver({
      params: schemaInput,
      returns: schemaResult,
      async resolve(params) {
        return {
          results: [params.query],
        }
      },
    })

    const resolvers = {globalResolver}
    const options = {resolvers}
    await buildSchema(options)
  })

  it('Should pass names correctly to types', async () => {
    const subSchema = schemaWithName('Sub', {
      query: {
        type: 'string',
      },
    })

    const schema = schemaWithName('Schema', {
      sub: {
        type: subSchema,
      },
    })

    const globalResolver = createResolver({
      params: schema,
      returns: schema,
      async resolve() {
        return null
      },
    })

    const resolvers = {globalResolver}
    const options = {resolvers}
    const graphqlSchema = await buildSchema(options)

    // @ts-ignore
    const resolverData = graphqlSchema.getQueryType()._fields.globalResolver

    expect(graphqlSchema.getType('Sub')).toBeDefined()
    expect(graphqlSchema.getType('Schema')).toBeDefined()
    expect(resolverData.args[0].type.name).toBe('SubInput')
  })

  it('should correctly pass resolver arguments when its a scalar', async () => {
    const schemaResult = schemaWithName('SchemaResult', {
      query: {
        type: 'string',
      },
    })

    const search = createResolver({
      returns: schemaResult,
      async resolve() {
        return {query: 'hola'}
      },
    })

    const searchResolver = createModelResolver({
      params: {
        name: {type: 'string'},
      },
      returns: String,
      async resolve() {
        return 'hola'
      },
    })

    const modelResolvers = {
      SchemaResult: {searchResolver},
    }

    const resolvers = {search}
    const graphqlSchema = await buildSchema({
      resolvers,
      modelResolvers,
    })

    const typeData = graphqlSchema.getType('SchemaResult').toConfig() as any
    expect(typeData.fields.searchResolver.args.name).toBeDefined()
  })
})
