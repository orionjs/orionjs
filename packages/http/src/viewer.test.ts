import {setGetViewer} from './viewer'
import {getApp} from './start'
import route from './routes/route'
import registerRoute from './routes/registerRoute'
import request from 'supertest'

describe('Test viewer', () => {
  test('It should pass the correct viewer', async () => {
    setGetViewer(async req => {
      return {
        name: req.params.name,
        lastName: req.body.lastName
      }
    })

    const testRoute = route({
      path: '/testViewer/:name',
      method: 'post',
      bodyParser: 'json',
      async resolve(req, res, viewer) {
        return {body: viewer}
      }
    })

    registerRoute(testRoute)

    const app = getApp()
    const response = await request(app).post('/testViewer/nico').send({lastName: 'López'})
    expect(response.body).toEqual({name: 'nico', lastName: 'López'})
  })

  test('It should throw an error correctly when getViewer returns an error', async () => {
    setGetViewer(async req => {
      throw new Error('invalid headers')
    })

    const testRoute = route({
      path: '/testViewer/:name',
      method: 'post',
      bodyParser: 'json',
      async resolve(req, res, viewer) {
        return {body: viewer}
      }
    })

    registerRoute(testRoute)

    const app = getApp()
    const response = await request(app).post('/testViewer/nico').send({lastName: 'López'})

    // expect reponse code to be 401
    expect(response.status).toBe(401)
    expect(response.body).toEqual({error: 'AuthError', message: 'invalid headers'})
  })
})
