import {registerRoute, registerRoutes, route} from '.'

it('should correctly register a route', async () => {
  const homeRoute = route({
    path: '/',
    method: 'get',
    async resolve(_req, _res, _viewer) {},
  })

  registerRoute(homeRoute)
})

it('should correctly register a route map', async () => {
  const routes = {
    route1: route({
      path: '/',
      method: 'get',
      async resolve(_req, _res, _viewer) {},
    }),
    route2: route({
      path: '/2',
      method: 'get',
      async resolve(_req, _res, _viewer) {},
    }),
  }

  registerRoutes(routes)
})
