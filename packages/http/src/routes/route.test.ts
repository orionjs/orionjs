import {getApp} from './../start'
import route from './route'
import registerRoute from './registerRoute'
import request from 'supertest'

let app = getApp()

describe('Test routes', () => {
  test('It should response a http get request', async () => {
    const test = {hello: 'world'}
    const testRoute = route({
      path: '/test1',
      method: 'get',
      async resolve(req, res, viewer) {
        return {body: test, statusCode: 201}
      }
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
      }
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
      }
    })

    registerRoute(testRoute)

    const response = await request(app).post('/test3')
    expect(response.statusCode).toBe(504)
    expect(response.body).toEqual({error: '504'})
  })
})
