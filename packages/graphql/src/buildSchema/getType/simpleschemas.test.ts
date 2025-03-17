import {createResolver} from '@orion-js/resolvers'
import buildSchema from '..'
import {describe, it} from 'vitest'
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
})
