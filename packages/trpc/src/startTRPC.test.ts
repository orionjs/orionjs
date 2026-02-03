import {describe, it, expect} from 'vitest'
import request from 'supertest'
import {express} from '@orion-js/http'
import {startTRPC} from './startTRPC'
import {createTQuery} from './createTQuery'
import {createTMutation} from './createTMutation'

describe('startTRPC', () => {
  it('should start tRPC and make a query request', async () => {
    const procedures = {
      helloWorld: createTQuery({
        params: {name: {type: 'string'}},
        returns: 'string',
        resolve: async ({name}) => {
          return `Hello ${name}`
        },
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app)
      .get('/trpc/helloWorld')
      .query({input: JSON.stringify({name: 'Nico'})})

    expect(response.body.result.data).toBe('Hello Nico')
  })

  it('should return validation errors correctly', async () => {
    const procedures = {
      helloWorld: createTQuery({
        params: {
          name: {type: 'string', validate: () => 'notUnique'},
        },
        returns: 'string',
        resolve: async ({name}) => `Hello ${name}`,
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app)
      .get('/trpc/helloWorld')
      .query({input: JSON.stringify({name: 'Nico'})})

    expect(response.body.error.data.isValidationError).toBe(true)
  })

  it('should handle mutations', async () => {
    const procedures = {
      createUser: createTMutation({
        params: {name: {type: 'string'}},
        returns: {name: {type: 'string'}},
        resolve: async ({name}) => ({name}),
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).post('/trpc/createUser').send({name: 'Test'})

    expect(response.body.result.data.name).toBe('Test')
  })

  it('should handle procedures without params', async () => {
    const procedures = {
      getStatus: createTQuery({
        returns: 'string',
        resolve: async () => 'ok',
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).get('/trpc/getStatus')

    expect(response.body.result.data).toBe('ok')
  })

  it('should filter out private procedures', async () => {
    const procedures = {
      publicQuery: createTQuery({
        returns: 'string',
        resolve: async () => 'public',
      }),
      privateQuery: createTQuery({
        private: true,
        returns: 'string',
        resolve: async () => 'private',
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const publicResponse = await request(app).get('/trpc/publicQuery')
    expect(publicResponse.body.result.data).toBe('public')

    const privateResponse = await request(app).get('/trpc/privateQuery')
    expect(privateResponse.status).toBe(404)
  })

  it('should use custom path', async () => {
    const procedures = {
      test: createTQuery({
        returns: 'string',
        resolve: async () => 'test',
      }),
    }

    const app = express()
    await startTRPC({procedures, app, path: '/api/trpc'})

    const response = await request(app).get('/api/trpc/test')
    expect(response.body.result.data).toBe('test')
  })

  it('should clean output according to schema', async () => {
    const procedures = {
      getUser: createTQuery({
        returns: {name: {type: 'string'}},
        resolve: async () => ({name: 'Test', extraField: 'should be removed'}),
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).get('/trpc/getUser')

    expect(response.body.result.data).toEqual({name: 'Test'})
    expect(response.body.result.data.extraField).toBeUndefined()
  })

  it('should pass viewer as second argument', async () => {
    const procedures = {
      getViewer: createTQuery({
        returns: {userId: {type: 'string'}},
        resolve: async (params, viewer) => {
          return {userId: viewer?.userId || 'anonymous'}
        },
      }),
    }

    const app = express()
    await startTRPC({procedures, app})

    const response = await request(app).get('/trpc/getViewer')

    expect(response.body.result.data.userId).toBe('anonymous')
  })
})
