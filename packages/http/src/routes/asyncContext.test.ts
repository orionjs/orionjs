import {describe, it, expect, beforeEach} from 'vitest'
import request from 'supertest'
import {getApp} from '../start'
import {createRoute} from './route'
import registerRoute from './registerRoute'
import {setGetViewer} from '../viewer'
import {getOrionAsyncContext, RouteAsyncContext} from '@orion-js/logger'

describe('http async context', () => {
  beforeEach(() => {
    setGetViewer(async () => {
      return {id: 'viewer-ctx'}
    })
  })

  it('stores route context', async () => {
    const sampleRoute = createRoute({
      path: '/async-context-test',
      method: 'post',
      async resolve() {
        const context = getOrionAsyncContext() as RouteAsyncContext
        return {
          body: {
            contextId: context?.contextId,
            routeName: context?.routeName,
            pathname: context?.controllerType === 'route' ? context.pathname : undefined,
            viewerId: (context?.viewer as {id: string}).id,
          },
        }
      },
    })

    registerRoute(sampleRoute)
    const app = getApp()
    const response = await request(app).post('/async-context-test').send({example: true})
    expect(response.status).toBe(200)
    expect(response.body.contextId).toBeDefined()
    expect(typeof response.body.contextId).toBe('string')
    expect(response.body.routeName).toBe('/async-context-test')
    expect(response.body.pathname).toBe('/async-context-test')
    expect(response.body.viewerId).toBe('viewer-ctx')
  })
})
