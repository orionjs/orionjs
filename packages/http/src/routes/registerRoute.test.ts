import {describe, expect, it, vi} from 'vitest'
import registerRoute from './registerRoute'
import {createRoute} from './route'

describe('registerRoute', () => {
  it('registers the same route object once per app', () => {
    const get = vi.fn()
    const app = {get} as any
    const route = createRoute({
      app,
      method: 'get',
      path: '/health',
      async resolve() {
        return {
          body: {ok: true},
        }
      },
    })

    registerRoute(route)
    registerRoute(route)

    expect(get).toHaveBeenCalledTimes(1)
  })

  it('registers different route objects even with same path', () => {
    const get = vi.fn()
    const app = {get} as any

    registerRoute(
      createRoute({
        app,
        method: 'get',
        path: '/health',
        async resolve() {
          return {
            body: {route: 1},
          }
        },
      }),
    )
    registerRoute(
      createRoute({
        app,
        method: 'get',
        path: '/health',
        async resolve() {
          return {
            body: {route: 2},
          }
        },
      }),
    )

    expect(get).toHaveBeenCalledTimes(2)
  })
})
