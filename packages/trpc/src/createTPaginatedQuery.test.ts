import {schemaWithName} from '@orion-js/schema'
import {Inject, Service} from '@orion-js/services'
import {describe, expect, it} from 'vitest'
import {createTPaginatedQuery, PaginationParams} from './createTPaginatedQuery'
import {getTProcedures, Procedures, TPaginatedQuery} from './service'
import {t} from './trpc'
import {InferRouterOutputs} from './types'

// Helper to apply pagination to an array (simulates MongoDB behavior)
function applyPagination<T>(data: T[], {skip, limit, sort}: PaginationParams): T[] {
  const result = [...data]

  // Apply sort
  if (Object.keys(sort).length > 0) {
    const [key, direction] = Object.entries(sort)[0]
    result.sort((a, b) => {
      const aVal = (a as any)[key]
      const bVal = (b as any)[key]
      if (aVal < bVal) return direction === 1 ? -1 : 1
      if (aVal > bVal) return direction === 1 ? 1 : -1
      return 0
    })
  }

  // Apply skip and limit
  return result.slice(skip, skip + limit)
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
        getItems: async paginationParams => applyPagination(allItems, paginationParams),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listUsers.getItems({page: 1, limit: 2, params: {}})

    expect(result).toHaveProperty('items')
    expect(result.items).toHaveLength(2)
    expect(result.items[0].name).toBe('Alice')
    expect(result.items[1].name).toBe('Bob')
    // Should NOT have pagination metadata
    expect(result).not.toHaveProperty('totalCount')
    expect(result).not.toHaveProperty('totalPages')
    expect(result).not.toHaveProperty('hasNextPage')
    expect(result).not.toHaveProperty('hasPreviousPage')
  })

  it('should return count with getCount action', async () => {
    const allItems = [{id: '1'}, {id: '2'}, {id: '3'}]

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getItems: async paginationParams => applyPagination(allItems, paginationParams),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getCount({params: {}})

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
        getItems: async () => [],
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getDescription()

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
        getItems: async paginationParams => applyPagination(allItems, paginationParams),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // First page
    const page1 = await caller.listItems.getItems({page: 1, limit: 10, params: {}})
    expect(page1.items[0].value).toBe(1)
    expect(page1.items).toHaveLength(10)

    // Second page
    const page2 = await caller.listItems.getItems({page: 2, limit: 10, params: {}})
    expect(page2.items[0].value).toBe(11)
    expect(page2.items).toHaveLength(10)

    // Last page
    const page3 = await caller.listItems.getItems({page: 3, limit: 10, params: {}})
    expect(page3.items[0].value).toBe(21)
    expect(page3.items).toHaveLength(5)

    // Get count separately
    const count = await caller.listItems.getCount({params: {}})
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
        getItems: async (paginationParams, {role}) => {
          const filtered = role ? allItems.filter(i => i.role === role) : allItems
          return applyPagination(filtered, paginationParams)
        },
        getCount: async ({role}) => {
          const filtered = role ? allItems.filter(i => i.role === role) : allItems
          return filtered.length
        },
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const admins = await caller.listUsersByRole.getItems({params: {role: 'admin'}})
    expect(admins.items).toHaveLength(2)
    expect(admins.items.every(i => i.role === 'admin')).toBe(true)

    const adminCount = await caller.listUsersByRole.getCount({params: {role: 'admin'}})
    expect(adminCount).toEqual({totalCount: 2})

    const allCount = await caller.listUsersByRole.getCount({params: {}})
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
        getItems: async paginationParams => applyPagination(allItems, paginationParams),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Sort by name asc
    const byNameAsc = await caller.listUsers.getItems({
      sortBy: 'name',
      sortType: 'asc',
      params: {},
    })
    expect(byNameAsc.items[0].name).toBe('Alice')
    expect(byNameAsc.items[1].name).toBe('Bob')
    expect(byNameAsc.items[2].name).toBe('Charlie')

    // Sort by age desc
    const byAgeDesc = await caller.listUsers.getItems({
      sortBy: 'age',
      sortType: 'desc',
      params: {},
    })
    expect(byAgeDesc.items[0].age).toBe(35)
    expect(byAgeDesc.items[1].age).toBe(30)
    expect(byAgeDesc.items[2].age).toBe(25)
  })

  it('should use default limit and max limit', async () => {
    const allItems = Array.from({length: 100}, (_, i) => ({id: `${i}`}))

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        defaultLimit: 5,
        maxLimit: 10,
        getItems: async paginationParams => applyPagination(allItems, paginationParams),
        getCount: async () => allItems.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    // Default limit
    const defaultResult = await caller.listItems.getItems({params: {}})
    expect(defaultResult.items).toHaveLength(5)

    // Custom limit within max
    const customResult = await caller.listItems.getItems({limit: 8, params: {}})
    expect(customResult.items).toHaveLength(8)

    // Limit exceeding max should be validated
    await expect(caller.listItems.getItems({limit: 15, params: {}})).rejects.toThrow()
  })

  it('should pass viewer to getItems and getCount', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getItems: async (paginationParams, params, viewer) => {
          return [{id: '1', ownerId: viewer?.userId || 'anonymous'}]
        },
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)

    const callerWithViewer = t.createCallerFactory(router)({viewer: {userId: 'user-123'}})
    const result = await callerWithViewer.listItems.getItems({params: {}})
    expect(result.items[0].ownerId).toBe('user-123')

    const callerNoViewer = t.createCallerFactory(router)({viewer: null})
    const result2 = await callerNoViewer.listItems.getItems({params: {}})
    expect(result2.items[0].ownerId).toBe('anonymous')
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
        getItems: async paginationParams =>
          applyPagination(this.dataService.getItems(), paginationParams),
        getCount: async () => this.dataService.getItems().length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getItems({params: {}})
    expect(result.items).toHaveLength(2)
    expect(result.items[0].title).toBe('Item 1')
  })

  it('should clean output according to returns schema when provided', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        returns: {id: {type: 'ID'}, name: {type: 'string'}},
        getItems: async () => [{id: '1', name: 'Test', extraField: 'should be removed'}],
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getItems({params: {}})
    expect(result.items[0]).toEqual({id: '1', name: 'Test'})
    expect((result.items[0] as any).extraField).toBeUndefined()
  })

  it('should not clean output when returns schema is not provided', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getItems: async () => [{id: '1', name: 'Test', extraField: 'should be kept'}],
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getItems({params: {}})
    expect(result.items[0]).toEqual({id: '1', name: 'Test', extraField: 'should be kept'})
  })

  it('should validate user params', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        params: {
          search: {type: 'string', min: 3},
        },
        getItems: async () => [],
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    await expect(caller.listItems.getItems({params: {search: 'ab'}})).rejects.toThrow()
    await expect(caller.listItems.getItems({params: {search: 'abc'}})).resolves.toBeDefined()
  })

  it('should handle empty results', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getItems: async () => [] as {id: string}[],
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getItems({params: {}})
    expect(result.items).toHaveLength(0)

    const count = await caller.listItems.getCount({params: {}})
    expect(count).toEqual({totalCount: 0})
  })

  it('should validate page must be at least 1', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getItems: async () => [{id: '1'}],
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    await expect(caller.listItems.getItems({page: 0, params: {}})).rejects.toThrow()
    await expect(caller.listItems.getItems({page: -1, params: {}})).rejects.toThrow()
  })

  it('should return empty allowedSorts when not configured', async () => {
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        getItems: async () => [],
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getDescription()

    expect(result).toEqual({
      allowedSorts: [],
      defaultSortBy: undefined,
      defaultSortType: undefined,
    })
  })

  it('should automatically infer item types from getItems return type', async () => {
    interface User {
      id: string
      name: string
      email: string
    }

    const users: User[] = [
      {id: '1', name: 'Alice', email: 'alice@example.com'},
      {id: '2', name: 'Bob', email: 'bob@example.com'},
    ]

    // NO manual type annotation - types should be inferred from getItems return
    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listUsers = createTPaginatedQuery({
        getItems: async paginationParams => applyPagination(users, paginationParams),
        getCount: async () => users.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listUsers.getItems({params: {}})
    // Type should be User[] - inferred automatically
    expect(result.items[0].name).toBe('Alice')
    expect(result.items[0].email).toBe('alice@example.com')

    // Type inference test - verify types are correctly inferred with our custom InferRouterOutputs
    type RouterOutputs = InferRouterOutputs<typeof router>
    type ListUsersOutput = RouterOutputs['listUsers']

    const _checkType = (output: ListUsersOutput) => {
      const item = output.getItems.items[0]
      // These should compile without errors - types are inferred
      const _id: string = item.id
      const _name: string = item.name
      const _email: string = item.email
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
        getItems: async paginationParams => applyPagination(products, paginationParams),
        getCount: async () => products.length,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)

    type RouterOutputs = InferRouterOutputs<typeof router>
    type ListProductsOutput = RouterOutputs['listProducts']

    // Type checking - should correctly infer Product type
    const _checkTypes = (output: ListProductsOutput) => {
      const item = output.getItems.items[0]
      // Valid properties
      const _id: string = item.id
      const _title: string = item.title
      const _price: number = item.price

      // @ts-expect-error - 'name' does not exist on Product
      const _invalidProp = item.name

      // @ts-expect-error - price is number, not string
      const _wrongType: string = item.price
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
        getItems: async () => [{id: '1', name: 'Test', extra: 'removed'}],
        getCount: async () => 1,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    const result = await caller.listItems.getItems({params: {}})
    expect(result.items[0].name).toBe('Test')
    expect((result.items[0] as any).extra).toBeUndefined()
  })

  it('should pass pagination params ready for MongoDB', async () => {
    let receivedPaginationParams: PaginationParams | null = null

    @Procedures()
    class TestProcedures {
      @TPaginatedQuery()
      listItems = createTPaginatedQuery({
        allowedSorts: ['name', 'createdAt'],
        getItems: async paginationParams => {
          receivedPaginationParams = paginationParams
          return []
        },
        getCount: async () => 0,
      })
    }

    const procedures = getTProcedures(TestProcedures)
    const router = t.router(procedures)
    const caller = t.createCallerFactory(router)({viewer: null})

    await caller.listItems.getItems({
      page: 2,
      limit: 10,
      sortBy: 'name',
      sortType: 'desc',
      params: {},
    })

    expect(receivedPaginationParams).toEqual({
      skip: 10, // page 2 with limit 10 = skip 10
      limit: 10,
      sort: {name: -1}, // desc = -1
    })
  })
})
