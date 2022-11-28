import {createModel} from '@orion-js/models'
import {generateId} from '@orion-js/helpers'
import paginatedResolver from '.'
import {TypedSchema, Prop} from '@orion-js/typed-model'
import {createCollection} from '@orion-js/mongodb'

describe('Full example of paginated resolver', () => {
  const createResolver = async () => {
    @TypedSchema()
    class ItemSchema {
      @Prop()
      name: string

      @Prop()
      index: number
    }

    const collection = createCollection<ItemSchema>({
      name: generateId(),
      schema: ItemSchema
    })

    await collection.insertMany([
      {name: `Number 1`, index: 1},
      {name: `Number 2`, index: 2},
      {name: `Number 3`, index: 3},
      {name: `Number 4`, index: 4},
      {name: `Number 5`, index: 5},
      {name: `Number 6`, index: 6}
    ])

    @TypedSchema()
    class Params {
      @Prop({optional: true})
      filter?: string
    }

    return paginatedResolver({
      returns: ItemSchema,
      params: Params,
      allowedSorts: ['index'],
      async getCursor(params: Params) {
        const query: any = {}
        if (params.filter) {
          query.name = params.filter
        }
        return collection.find(query)
      }
    })
  }

  it('should work passing custom params', async () => {
    const resolver = await createResolver()
    const result = (await resolver.resolve(
      {
        filter: `Number 1`
      },
      {}
    )) as any
    const items = await result.items()
    const count = await result.totalCount()
    expect(items.length).toBe(1)
    expect(items[0].index).toBe(1)
    expect(count).toBe(1)
  })

  it('should using sorts', async () => {
    const resolver = await createResolver()
    const result = (await resolver.resolve(
      {
        sortBy: 'index',
        sortType: 'asc'
      },
      {}
    )) as any
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
      toArray: async () => [{hello: 'foo'}]
    }
    return paginatedResolver({
      returns: createModel({
        name: 'Hello',
        schema: {
          hello: {
            type: String
          }
        }
      }),
      async getCursor() {
        return {
          cursor: cursor,
          count: () => 10
        }
      }
    })
  }

  it('should not call cursor.count', async () => {
    const resolver = await createResolver()
    const result = (await resolver.resolve({}, {})) as any
    const items = await result.items()
    const count = await result.totalCount()
    expect(items.length).toBe(1)
    expect(count).toBe(10)
  })
})
