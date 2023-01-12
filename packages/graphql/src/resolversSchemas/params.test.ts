import paramsResolver from './params'
import {resolversStore} from '../buildSchema/getResolvers/resolversStore'
import {resolver} from '@orion-js/resolvers'
import {createModel} from '@orion-js/models'

describe('Get params tests', () => {
  it('Should return the correct information for a resolver that returns a string array', async () => {
    resolversStore.aResolver = resolver({
      params: {
        aParam: {
          type: String
        }
      },
      returns: [String],
      async resolve() {
        return ['a', 'b']
      }
    })

    const response = (await paramsResolver.execute({
      params: {
        name: 'aResolver',
        mutation: false
      }
    })) as any

    const params = await response.params()
    const result = await response.result()
    const basicResultQuery = await response.basicResultQuery()

    expect(response.name).toEqual('aResolver')
    expect(params).toEqual({aParam: {type: 'string', __graphQLType: 'String'}})
    expect(result).toEqual(undefined)
    expect(basicResultQuery).toEqual('')
  })

  it('Should return the correct information for a resolver that returns a array of a model', async () => {
    const model = createModel({
      name: 'Item',
      schema: {
        name: {
          type: String
        }
      }
    })

    resolversStore.bResolver = resolver({
      params: {
        aParam: {
          type: String
        }
      },
      returns: [model],
      async resolve() {
        return [{name: 'Nico'}]
      }
    })

    const response = (await paramsResolver.execute({
      params: {
        name: 'bResolver',
        mutation: false
      }
    })) as any

    const params = await response.params()
    const result = await response.result()
    const basicResultQuery = await response.basicResultQuery()
    expect(response.name).toEqual('bResolver')
    expect(params).toEqual({aParam: {type: 'string', __graphQLType: 'String'}})
    expect(result).toEqual(undefined)
    expect(basicResultQuery).toEqual('{ name }')
  })

  it('Should return the correct information for a resolver that returns a model', async () => {
    const model2 = createModel({
      name: 'Item2',
      schema: {
        name: {
          type: String
        }
      }
    })

    resolversStore.cResolver = resolver({
      params: {
        aParam: {
          type: String
        }
      },
      returns: model2,
      async resolve() {
        return [{name: 'Nico'}]
      }
    })

    const response = (await paramsResolver.execute({
      params: {
        name: 'cResolver',
        mutation: false
      }
    })) as any

    const params = await response.params()
    const result = await response.result()
    const basicResultQuery = await response.basicResultQuery()
    expect(response.name).toEqual('cResolver')
    expect(params).toEqual({aParam: {type: 'string', __graphQLType: 'String'}})
    expect(result).toEqual('Item2')
    expect(basicResultQuery).toEqual('{ name }')
  })
})
