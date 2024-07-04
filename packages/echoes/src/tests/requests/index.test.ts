import {echo, request, startService} from '../..'
import testRequest from 'supertest'
import {getApp} from '@orion-js/http'
import {RequestMaker} from '../../types'
import {ValidationError} from '@orion-js/schema'

describe('Test echoes requests', () => {
  const makeRequest: RequestMaker = async options => {
    const app = getApp()
    const response = await testRequest(app).post('/echoes-services').send(options.data)
    return {
      statusCode: response.statusCode,
      data: response.body,
    }
  }

  it('Should start echoes requests service', () => {
    const echoes = {
      test: echo({
        type: 'request',
        async resolve() {},
      }),
    }

    startService({
      echoes,
      requests: {
        key: 'secret',
        services: {},
      },
    })
  })

  it('Should be able to make a echoes request passing dates as params', async () => {
    expect.assertions(5)

    const echoes = {
      test: echo({
        type: 'request',
        async resolve(params) {
          expect(params.hello).toBe('world')
          expect(params.date).toBeInstanceOf(Date)
          return {
            text: 'Hello world',
            date: params.date,
          }
        },
      }),
    }

    startService({
      echoes,
      requests: {
        key: 'secret',
        services: {test: 'mockURL'},
        makeRequest,
      },
    })

    const date = new Date()
    const result = await request({
      method: 'test',
      service: 'test',
      params: {
        hello: 'world',
        date,
      },
    })

    expect(result.text).toBe('Hello world')
    expect(result.date).toBeInstanceOf(Date)
    expect(result.date.getTime()).toBe(date.getTime())
  })

  it('should pass errors to Orion errors', async () => {
    const echoes = {
      test: echo({
        type: 'request',
        async resolve() {
          throw new ValidationError({hello: 'world'})
        },
      }),
    }

    startService({
      echoes,
      requests: {
        key: 'secret',
        services: {test: 'mockURL'},
        makeRequest,
      },
    })

    expect.assertions(1)

    try {
      await request({
        method: 'test',
        service: 'test',
        params: {},
      })
    } catch (error) {
      expect(error.validationErrors).toEqual({hello: 'world'})
    }
  })
})
