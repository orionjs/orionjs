import {getServiceRoutes, Route, Routes} from './http'

describe('Routes with service injections', () => {
  it('Should define a routes map using services', async () => {
    @Routes()
    class RoutesService {
      @Route({method: 'get', path: '/route1'})
      async route1() {
        return {
          statusCode: 200,
          body: 'route1'
        }
      }
    }

    const routes = getServiceRoutes(RoutesService)

    expect(routes).toMatchObject({
      route1: {
        method: 'get',
        path: '/route1'
      }
    })
  })
})
