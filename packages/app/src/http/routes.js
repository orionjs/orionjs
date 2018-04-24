import unionBy from 'lodash/unionBy'
import pathToRegexp from 'path-to-regexp'
import matcher from 'path-match'

global.allRoutes = []

export const addRoutes = function(routes) {
  routes = routes.map(route => {
    return {
      regex: pathToRegexp(route.path),
      match: matcher()(route.path),
      ...route
    }
  })
  global.allRoutes = unionBy(global.allRoutes, routes, 'path')
}

export const getRoutes = function() {
  return global.allRoutes
}

export const getRoute = function(path) {
  for (const route of global.allRoutes) {
    if (!route.regex.test(path)) continue
    return route
  }
}
