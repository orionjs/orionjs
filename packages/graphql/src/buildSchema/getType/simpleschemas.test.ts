import {resolver} from '@orion-js/resolvers'
import {Schema} from '@orion-js/schema'
import buildSchema from '..'
import {describe, it, expect} from 'vitest'

describe('Enum test', () => {
  it('Should create correctly types when using schemas (not models)', async () => {
    const schemaInput: Schema = {
      query: {
        type: 'string',
      },
    } as const

    const schemaResult: Schema = {
      results: {
        type: ['string'],
      },
    } as const

    const globalResolver = resolver({
      params: schemaInput,
      returns: schemaResult,
      async resolve(params) {
        return params
      },
    })

    const resolvers = {globalResolver}
    const options = {resolvers}
    await buildSchema(options)
  })
})
