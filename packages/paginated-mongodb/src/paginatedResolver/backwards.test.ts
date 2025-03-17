import {createModel} from '@orion-js/models'
import {generateId} from '@orion-js/helpers'
import {createPaginatedResolver} from '.'
import {TypedSchema, Prop} from '@orion-js/typed-model'
import {createCollection} from '@orion-js/mongodb'
import {describe, it, expect} from 'vitest'
import {internal_appendResolversToItem} from '@orion-js/resolvers'
import {getPaginatedResolverResolvers} from './getModel'

describe('Backwards compatibility (TypedSchema)', () => {
  const createResolver = async () => {
    @TypedSchema()
    class ItemSchema {
      @Prop({type: String})
      _id: string

      @Prop({type: String})
      name: string

      @Prop({type: Number})
      index: number
    }

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

    @TypedSchema()
    class Params {
      @Prop({type: String, optional: true})
      filter?: string
    }

    const paginatedResolver = createPaginatedResolver({
      returns: ItemSchema as any,
      params: Params as any,
      allowedSorts: ['index'],
      async getCursor(params: Params) {
        const query: any = {}
        if (params.filter) {
          query.name = params.filter
        }
        return collection.find(query)
      },
    })

    const modelResolvers = getPaginatedResolverResolvers('ItemSchema', ItemSchema as any)

    return {
      paginatedResolver,
      modelResolvers,
    }
  }

  it('should work passing custom params', async () => {
    const {paginatedResolver, modelResolvers} = await createResolver()
    const preResult = await paginatedResolver.resolve(
      {
        filter: 'Number 1',
      },
      {},
    )
    const result = internal_appendResolversToItem(preResult, modelResolvers as any) as any
    const items = await result.items()
    const count = await result.totalCount()
    expect(items.length).toBe(1)
    expect(items[0].index).toBe(1)
    expect(count).toBe(1)
  })

  it('should using sorts', async () => {
    const {paginatedResolver, modelResolvers} = await createResolver()
    const preResult = (await paginatedResolver.resolve(
      {
        sortBy: 'index',
        sortType: 'asc',
      },
      {},
    )) as any
    const result = internal_appendResolversToItem(preResult, modelResolvers as any) as any

    const items = await result.items()
    const count = await result.totalCount()
    expect(items.map(item => item.index)).toEqual([1, 2, 3, 4, 5, 6])
    expect(count).toBe(6)
  })
})

describe('Cursors with count', () => {
  const createResolver = async () => {
    const cursor = {
      count: () => 100,
      toArray: async () => [{hello: 'foo'}],
    }
    const ItemSchema = createModel({
      name: 'Hello',
      schema: {
        hello: {
          type: String,
        },
      },
    })
    const paginatedResolver = createPaginatedResolver({
      returns: ItemSchema as any,
      async getCursor() {
        return {
          cursor: cursor,
          count: () => 10,
        }
      },
    })

    const modelResolvers = getPaginatedResolverResolvers('ItemSchema', ItemSchema as any)

    return {
      paginatedResolver,
      modelResolvers,
    }
  }

  it('should not call cursor.count', async () => {
    const {paginatedResolver, modelResolvers} = await createResolver()
    const preResult = (await paginatedResolver.resolve({}, {})) as any
    const result = internal_appendResolversToItem(preResult, modelResolvers as any) as any

    const items = await result.items()
    const count = await result.totalCount()
    expect(items.length).toBe(1)
    expect(count).toBe(10)
  })
})
