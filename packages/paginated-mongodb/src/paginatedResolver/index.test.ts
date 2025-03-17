import {generateId} from '@orion-js/helpers'
import {createPaginatedResolver} from '.'
import {createCollection, InferSchemaTypeWithId, MongoFilter, typedId} from '@orion-js/mongodb'
import {describe, it, expect} from 'vitest'
import {schemaWithName} from '@orion-js/schema'
import {getPaginatedResolverResolvers} from './getModel'
import {internal_appendResolversToItem} from '@orion-js/resolvers'

describe('Full example of paginated resolver', () => {
  const createResolver = async () => {
    const ItemSchema = schemaWithName('ItemSchema', {
      _id: {
        type: typedId('item'),
      },
      name: {
        type: 'string',
      },
      index: {
        type: 'number',
      },
    })

    const collection = createCollection({
      name: generateId(),
      schema: ItemSchema,
    })

    await collection.insertMany([
      {name: 'Number 1', index: 1},
      {name: 'Number 2', index: 2},
      {name: 'Number 3', index: 3},
      {name: 'Number 4', index: 4},
      {name: 'Number 5', index: 5},
      {name: 'Number 6', index: 6},
    ])

    const Params = schemaWithName('Params', {
      filter: {
        type: 'string',
        optional: true,
      },
    })

    const paginatedResolver = createPaginatedResolver({
      returns: ItemSchema,
      params: Params,
      allowedSorts: ['index'],
      async getCursor(params) {
        const query: MongoFilter<InferSchemaTypeWithId<typeof ItemSchema>> = {}
        if (params.filter) {
          query.name = params.filter
        }
        return {
          cursor: collection.find(query),
          count: () => collection.countDocuments(query),
        }
      },
    })

    const modelResolvers = getPaginatedResolverResolvers('ItemSchema', ItemSchema) as any

    return {
      paginatedResolver,
      modelResolvers,
    }
  }

  it('should work passing custom params', async () => {
    const {paginatedResolver, modelResolvers} = await createResolver()
    const preResult = await paginatedResolver.resolve({filter: 'Number 1'}, {})
    const result = internal_appendResolversToItem(preResult, modelResolvers) as any
    const items = await result.items()
    const count = await result.totalCount()
    expect(items.length).toBe(1)
    expect(items[0].index).toBe(1)
    expect(count).toBe(1)
  })
})
