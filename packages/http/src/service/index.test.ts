import {Inject, Service} from '@orion-js/services'
import {getServiceRoutes, Route, Routes} from '.'
import {getApp} from '../start'
import request from 'supertest'
import registerRoutes from '../routes/registerRoutes'
import {Request} from '../types'

describe('Routes with service injections', () => {
  it('Should define a routes map using services', async () => {
    @Service()
    class ServiceExample {
      sayHi(name: string) {
        return `hello ${name}`
      }
    }

    @Routes()
    class RoutesService {
      @Inject()
      serviceExample: ServiceExample

      @Route({method: 'post', path: '/route-service-test', bodyParser: 'json'})
      async route(req: Request) {
        return {
          statusCode: 200,
          body: {
            message: this.serviceExample.sayHi(req.body.name)
          }
        }
      }
    }

    const routes = getServiceRoutes(RoutesService)
    registerRoutes(routes)

    const app = getApp()
    const response = await request(app).post('/route-service-test').send({name: 'nico'})
    expect(response.body).toEqual({message: `hello nico`})
  })
})
