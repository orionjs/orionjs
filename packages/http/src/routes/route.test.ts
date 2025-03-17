import {getApp} from './../start'
import {route} from './route'
import registerRoute from './registerRoute'
import request from 'supertest'
import {describe, test, expect} from 'vitest'

const app = getApp()

describe('Test routes', () => {
  test('It should reply a http get request with a custom status code', async () => {
    const test = {hello: 'world'}
    const testRoute = route({
      path: '/test1',
      method: 'get',
      async resolve(req, res, viewer) {
        return {body: test, statusCode: 201}
      },
    })

    registerRoute(testRoute)

    const response = await request(app).get('/test1')
    expect(response.statusCode).toBe(201)
    expect(response.body).toEqual(test)
  })

  test('It should fail on different method', async () => {
    const testRoute = route({
      path: '/test2',
      method: 'post',
      async resolve(req, res, viewer) {
        return {body: {status: 'ok'}, statusCode: 200}
      },
    })

    registerRoute(testRoute)

    const response = await request(app).get('/test2')
    expect(response.statusCode).toBe(404)
  })

  test('It should correctly send error messages', async () => {
    const testRoute = route({
      path: '/test3',
      method: 'post',
      async resolve(req, res, viewer) {
        return {body: {error: '504'}, statusCode: 504}
      },
    })

    registerRoute(testRoute)

    const response = await request(app).post('/test3')
    expect(response.statusCode).toBe(504)
    expect(response.body).toEqual({error: '504'})
  })

  // test a http get request with query params
  test('It should reply a http get request with query params', async () => {
    const testRoute = route({
      path: '/test4',
      method: 'get',
      async resolve(req, res, viewer) {
        return {body: req.query, statusCode: 200}
      },
    })

    registerRoute(testRoute)

    const response = await request(app).get('/test4?hello=world')
    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({hello: 'world'})
  })

  test('It should respond a http get request with text body', async () => {
    const testRoute = route({
      path: '/test5',
      method: 'get',
      async resolve(req, res, viewer) {
        return {body: 'hello world', statusCode: 200}
      },
    })

    registerRoute(testRoute)

    const response = await request(app).get('/test5')
    expect(response.statusCode).toBe(200)
    expect(response.text).toBe('hello world')
  })

  test('It should handle a http request of type get and post on the same path', async () => {
    const testRoute = route({
      path: '/test6',
      method: 'all',
      async resolve(req, res, viewer) {
        return {body: 'hello world', statusCode: 200}
      },
    })

    registerRoute(testRoute)

    const response = await request(app).get('/test6')
    expect(response.statusCode).toBe(200)
    expect(response.text).toBe('hello world')

    const response2 = await request(app).post('/test6')
    expect(response2.statusCode).toBe(200)
    expect(response2.text).toBe('hello world')
  })

  test('It should handle 302 route types', async () => {
    const testRoute = route({
      path: '/test7',
      method: 'get',
      async resolve(req, res, viewer) {
        return {
          statusCode: 302,
          body: '',
          headers: {
            location: '/test8',
          },
        }
      },
    })

    registerRoute(testRoute)

    const response = await request(app).get('/test7')
    expect(response.statusCode).toBe(302)
    expect(response.header.location).toBe('/test8')
  })
})
