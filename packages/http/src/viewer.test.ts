import {setGetViewer} from './viewer'
import {getApp} from './start'
import route from './routes/route'
import registerRoute from './routes/registerRoute'
import request from 'supertest'

describe('Test viewer', () => {
  test('Is should pass the correct viewer', async () => {
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
})
