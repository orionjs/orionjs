import paramsResolver from './params'
import {resolversStore} from '../buildSchema/getResolvers/resolversStore'
import {createResolver, resolver} from '@orion-js/resolvers'
import {describe, it, expect} from 'vitest'
import {schemaWithName} from '@orion-js/schema'
describe('Get params tests', () => {
  it('Should return the correct information for a resolver that returns a string array', async () => {
    resolversStore.aResolver = createResolver({
      params: {
        aParam: {
          type: String,
        },
      },
      returns: [String],
      async resolve() {
        return ['a', 'b']
      },
    })

    const response = await paramsResolver.execute({
      params: {
        name: 'aResolver',
        mutation: false,
      },
    })

    console.log(response, 'executed')

    expect(response.name).toEqual('aResolver')
    expect(response.params).toEqual({aParam: {type: 'string', __graphQLType: 'String'}})
    expect(response.result).toEqual(undefined)
    expect(response.basicResultQuery).toEqual('')
  })

  it('Should return the correct information for a resolver that returns a string', async () => {
    resolversStore.aaResolver = resolver({
      params: {
        aParam: {
          type: String,
        },
      },
      returns: [String],
      async resolve() {
        return ['a']
      },
    })

    const response = await paramsResolver.execute({
      params: {
        name: 'aaResolver',
        mutation: false,
      },
    })

    expect(response.name).toEqual('aaResolver')
    expect(response.params).toEqual({aParam: {type: 'string', __graphQLType: 'String'}})
    expect(response.result).toEqual(undefined)
    expect(response.basicResultQuery).toEqual('')
  })

  it('Should return the correct information for a resolver that returns a array of a model', async () => {
    const model = schemaWithName('Item', {
      name: {
        type: String,
      },
    })

    resolversStore.bResolver = createResolver({
      params: {
        aParam: {
          type: String,
        },
      },
      returns: [model],
      async resolve() {
        return [{name: 'Nico'}]
      },
    })

    const response = await paramsResolver.execute({
      params: {
        name: 'bResolver',
        mutation: false,
      },
    })

    expect(response.name).toEqual('bResolver')
    expect(response.params).toEqual({aParam: {type: 'string', __graphQLType: 'String'}})
    expect(response.result).toEqual('Item')
    expect(response.basicResultQuery).toEqual('{ name }')
  })

  it('Should return the correct information for a resolver that returns a model', async () => {
    const model2 = schemaWithName('Item2', {
      name: {
        type: String,
      },
    })

    resolversStore.cResolver = createResolver({
      params: {
        aParam: {
          type: String,
        },
      },
      returns: model2,
      async resolve() {
        return {name: 'Nico'}
      },
    })

    const response = await paramsResolver.execute({
      params: {
        name: 'cResolver',
        mutation: false,
      },
    })

    expect(response.name).toEqual('cResolver')
    expect(response.params).toEqual({aParam: {type: 'string', __graphQLType: 'String'}})
    expect(response.result).toEqual('Item2')
    expect(response.basicResultQuery).toEqual('{ name }')
  })
})
