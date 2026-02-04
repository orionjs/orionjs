import {schemaWithName} from '@orion-js/schema'
import {Inject, Service} from '@orion-js/services'
import {inferRouterOutputs} from '@trpc/server'
import {describe, expect, it} from 'vitest'
import {buildRouter} from './buildRouter'
import {createTPaginatedQuery, PaginatedCursor} from './createTPaginatedQuery'
import {getTProcedures, Procedures, TPaginatedQuery} from './service'
import {t} from './trpc'

// Helper to create a mock cursor from an array
function createMockCursor<T>(data: T[]): PaginatedCursor<T> {
  let _skip = 0
  let _limit = data.length
  let _sort: {[key: string]: 1 | -1} | null = null

  return {
    skip(value: number) {
      _skip = value
    },
    limit(value: number) {
      _limit = value
    },
    sort(value: {[key: string]: 1 | -1}) {
      _sort = value
    },
    async toArray(): Promise<T[]> {
      const result = [...data]

      // Apply sort
      if (_sort) {
        const [key, direction] = Object.entries(_sort)[0]
        result.sort((a, b) => {
          const aVal = (a as any)[key]
          const bVal = (b as any)[key]
          if (aVal < bVal) return direction === 1 ? -1 : 1
          if (aVal > bVal) return direction === 1 ? 1 : -1
          return 0
        })
      }

      // Apply skip and limit
      return result.slice(_skip, _skip + _limit)
    },
  }
}

describe('createTPaginatedQuery', () => {
  it('should return items with getItems action', async () => {
    const allItems = [
      {id: '1', name: 'Alice'},
      {id: '2', name: 'Bob'},
      {id: '3', name: 'Charlie'},
      {id: '4', name: 'David'},
      {id: '5', name: 'Eve'},
    ]

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listUsers = createTPaginatedQuery({
        getCursor: async () => createMockCursor(allItems),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listUsers({action: 'getItems', params: {page: 1, limit: 2}})

    expect(result).toHaveProperty('items')
    if ('items' in result) {
      expect(result.items).toHaveLength(2)
      expect(result.items[0].name).toBe('Alice')
      expect(result.items[1].name).toBe('Bob')
      // Should NOT have pagination metadata
      expect(result).not.toHaveProperty('totalCount')
      expect(result).not.toHaveProperty('totalPages')
      expect(result).not.toHaveProperty('hasNextPage')
      expect(result).not.toHaveProperty('hasPreviousPage')
    }
  })

  it('should return count with getCount action', async () => {
    const allItems = [{id: '1'}, {id: '2'}, {id: '3'}]

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async () => createMockCursor(allItems),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getCount', params: {}})

    expect(result).toEqual({totalCount: 3})
  })

  it('should return description with getDescription action', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        allowedSorts: ['name', 'createdAt'],
        defaultSortBy: 'createdAt',
        defaultSortType: 'desc',
        getCursor: async () => createMockCursor([]),
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getDescription', params: {}})

    expect(result).toEqual({
      allowedSorts: ['name', 'createdAt'],
      defaultSortBy: 'createdAt',
      defaultSortType: 'desc',
    })
  })

  it('should handle pagination correctly on different pages', async () => {
    const allItems = Array.from({length: 25}, (_, i) => ({id: `${i + 1}`, value: i + 1}))

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async () => createMockCursor(allItems),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // First page
    const page1 = await caller.listItems({action: 'getItems', params: {page: 1, limit: 10}})
    if ('items' in page1) {
      expect(page1.items[0].value).toBe(1)
      expect(page1.items).toHaveLength(10)
    }

    // Second page
    const page2 = await caller.listItems({action: 'getItems', params: {page: 2, limit: 10}})
    if ('items' in page2) {
      expect(page2.items[0].value).toBe(11)
      expect(page2.items).toHaveLength(10)
    }

    // Last page
    const page3 = await caller.listItems({action: 'getItems', params: {page: 3, limit: 10}})
    if ('items' in page3) {
      expect(page3.items[0].value).toBe(21)
      expect(page3.items).toHaveLength(5)
    }

    // Get count separately
    const count = await caller.listItems({action: 'getCount', params: {}})
    expect(count).toEqual({totalCount: 25})
  })

  it('should support custom params', async () => {
    const allItems = [
      {id: '1', name: 'Alice', role: 'admin'},
      {id: '2', name: 'Bob', role: 'user'},
      {id: '3', name: 'Charlie', role: 'admin'},
      {id: '4', name: 'David', role: 'user'},
    ]

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listUsersByRole = createTPaginatedQuery({
        params: {role: {type: 'string', optional: true}},
        getCursor: async ({role}) => {
          const filtered = role ? allItems.filter(i => i.role === role) : allItems
          return createMockCursor(filtered)
        },
        getCount: async ({role}) => {
          const filtered = role ? allItems.filter(i => i.role === role) : allItems
          return filtered.length
        },
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const admins = await caller.listUsersByRole({action: 'getItems', params: {role: 'admin'}})
    if ('items' in admins) {
      expect(admins.items).toHaveLength(2)
      expect(admins.items.every(i => i.role === 'admin')).toBe(true)
    }

    const adminCount = await caller.listUsersByRole({action: 'getCount', params: {role: 'admin'}})
    expect(adminCount).toEqual({totalCount: 2})

    const allCount = await caller.listUsersByRole({action: 'getCount', params: {}})
    expect(allCount).toEqual({totalCount: 4})
  })

  it('should support sorting with allowedSorts', async () => {
    const allItems = [
      {id: '1', name: 'Charlie', age: 30},
      {id: '2', name: 'Alice', age: 25},
      {id: '3', name: 'Bob', age: 35},
    ]

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listUsers = createTPaginatedQuery({
        allowedSorts: ['name', 'age'],
        defaultSortBy: 'name',
        defaultSortType: 'asc',
        getCursor: async () => createMockCursor(allItems),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Sort by name asc
    const byNameAsc = await caller.listUsers({
      action: 'getItems',
      params: {sortBy: 'name', sortType: 'asc'},
    })
    if ('items' in byNameAsc) {
      expect(byNameAsc.items[0].name).toBe('Alice')
      expect(byNameAsc.items[1].name).toBe('Bob')
      expect(byNameAsc.items[2].name).toBe('Charlie')
    }

    // Sort by age desc
    const byAgeDesc = await caller.listUsers({
      action: 'getItems',
      params: {sortBy: 'age', sortType: 'desc'},
    })
    if ('items' in byAgeDesc) {
      expect(byAgeDesc.items[0].age).toBe(35)
      expect(byAgeDesc.items[1].age).toBe(30)
      expect(byAgeDesc.items[2].age).toBe(25)
    }
  })

  it('should use default limit and max limit', async () => {
    const allItems = Array.from({length: 100}, (_, i) => ({id: `${i}`}))

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        defaultLimit: 5,
        maxLimit: 10,
        getCursor: async () => createMockCursor(allItems),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Default limit
    const defaultResult = await caller.listItems({action: 'getItems', params: {}})
    if ('items' in defaultResult) {
      expect(defaultResult.items).toHaveLength(5)
    }

    // Custom limit within max
    const customResult = await caller.listItems({action: 'getItems', params: {limit: 8}})
    if ('items' in customResult) {
      expect(customResult.items).toHaveLength(8)
    }

    // Limit exceeding max should be validated
    await expect(caller.listItems({action: 'getItems', params: {limit: 15}})).rejects.toThrow()
  })

  it('should pass viewer to getCursor and getCount', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async (params, viewer) => {
          return createMockCursor([{id: '1', ownerId: viewer?.userId || 'anonymous'}])
        },
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)

    const callerWithViewer = t.createCallerFactory(router)({viewer: {userId: 'user-123'}})
    const result = await callerWithViewer.listItems({action: 'getItems', params: {}})
    if ('items' in result) {
      expect(result.items[0].ownerId).toBe('user-123')
    }

    const callerNoViewer = t.createCallerFactory(router)({viewer: null})
    const result2 = await callerNoViewer.listItems({action: 'getItems', params: {}})
    if ('items' in result2) {
      expect(result2.items[0].ownerId).toBe('anonymous')
    }
  })

  it('should work with dependency injection', async () => {
    @Service()
    class DataService {
      getItems() {
        return [
          {id: '1', title: 'Item 1'},
          {id: '2', title: 'Item 2'},
        ]
      }
    }

    @Procedures()
    class TestProcedures {
      @Inject(() => DataService)
      private dataService: DataService

      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async () => createMockCursor(this.dataService.getItems()),
        getCount: async () => this.dataService.getItems().length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getItems', params: {}})
    if ('items' in result) {
      expect(result.items).toHaveLength(2)
      expect(result.items[0].title).toBe('Item 1')
    }
  })

  it('should clean output according to returns schema when provided', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        returns: {id: {type: 'ID'}, name: {type: 'string'}},
        getCursor: async () =>
          createMockCursor([{id: '1', name: 'Test', extraField: 'should be removed'}]),
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getItems', params: {}})
    if ('items' in result) {
      expect(result.items[0]).toEqual({id: '1', name: 'Test'})
      expect((result.items[0] as any).extraField).toBeUndefined()
    }
  })

  it('should not clean output when returns schema is not provided', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async () =>
          createMockCursor([{id: '1', name: 'Test', extraField: 'should be kept'}]),
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getItems', params: {}})
    if ('items' in result) {
      expect(result.items[0]).toEqual({id: '1', name: 'Test', extraField: 'should be kept'})
    }
  })

  it('should validate params', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        params: {
          search: {type: 'string', min: 3},
        },
        getCursor: async () => createMockCursor([]),
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    await expect(caller.listItems({action: 'getItems', params: {search: 'ab'}})).rejects.toThrow()
    await expect(
      caller.listItems({action: 'getItems', params: {search: 'abc'}}),
    ).resolves.toBeDefined()
  })

  it('should handle empty results', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async () => createMockCursor([] as {id: string}[]),
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getItems', params: {}})
    if ('items' in result) {
      expect(result.items).toHaveLength(0)
    }

    const count = await caller.listItems({action: 'getCount', params: {}})
    expect(count).toEqual({totalCount: 0})
  })

  it('should validate page must be at least 1', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async () => createMockCursor([{id: '1'}]),
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    await expect(caller.listItems({action: 'getItems', params: {page: 0}})).rejects.toThrow()
    await expect(caller.listItems({action: 'getItems', params: {page: -1}})).rejects.toThrow()
  })

  it('should return empty allowedSorts when not configured', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getCursor: async () => createMockCursor([]),
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getDescription', params: {}})

    expect(result).toEqual({
      allowedSorts: [],
      defaultSortBy: undefined,
      defaultSortType: undefined,
    })
  })

  it('should automatically infer item types from getCursor return type without manual annotation', async () => {
    interface User {
      id: string
      name: string
      email: string
    }

    const users: User[] = [
      {id: '1', name: 'Alice', email: 'alice@example.com'},
      {id: '2', name: 'Bob', email: 'bob@example.com'},
    ]

    // NO manual type annotation - types should be inferred from getCursor return
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listUsers = createTPaginatedQuery({
        getCursor: async () => createMockCursor(users),
        getCount: async () => users.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listUsers({action: 'getItems', params: {}})
    if ('items' in result) {
      // Type should be User[] - inferred automatically
      expect(result.items[0].name).toBe('Alice')
      expect(result.items[0].email).toBe('alice@example.com')
    }

    // Type inference test - verify types are correctly inferred
    type RouterOutputs = inferRouterOutputs<typeof router>
    type ListUsersOutput = RouterOutputs['listUsers']

    // The output is a union type, but items should be User[]
    const _checkType = (output: ListUsersOutput) => {
      if ('items' in output) {
        const item = output.items[0]
        // These should compile without errors - types are inferred
        const _id: string = item.id
        const _name: string = item.name
        const _email: string = item.email
      }
    }

    expect(router).toBeDefined()
  })

  it('should have correct type errors when accessing wrong properties', async () => {
    interface Product {
      id: string
      title: string
      price: number
    }

    const products: Product[] = [{id: '1', title: 'Widget', price: 9.99}]

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listProducts = createTPaginatedQuery({
        getCursor: async () => createMockCursor(products),
        getCount: async () => products.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)

    type RouterOutputs = inferRouterOutputs<typeof router>
    type ListProductsOutput = RouterOutputs['listProducts']

    // Type checking - should correctly infer Product type
    const _checkTypes = (output: ListProductsOutput) => {
      if ('items' in output) {
        const item = output.items[0]
        // Valid properties
        const _id: string = item.id
        const _title: string = item.title
        const _price: number = item.price

        // @ts-expect-error - 'name' does not exist on Product
        const _invalidProp = item.name

        // @ts-expect-error - price is number, not string
        const _wrongType: string = item.price
      }
    }

    expect(router).toBeDefined()
  })

  it('should work with schemaWithName for optional schema cleaning', async () => {
    const ItemSchema = schemaWithName('Item', {
      id: {type: 'ID'},
      name: {type: 'string'},
    })

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        returns: ItemSchema,
        getCursor: async () => createMockCursor([{id: '1', name: 'Test', extra: 'removed'}]),
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = buildRouter(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems({action: 'getItems', params: {}})
    if ('items' in result) {
      expect(result.items[0].name).toBe('Test')
      expect((result.items[0] as any).extra).toBeUndefined()
    }
  })
})
