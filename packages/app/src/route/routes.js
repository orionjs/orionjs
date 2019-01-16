import pathToRegexp from 'path-to-regexp'
import matcher from 'path-match'

global.allRoutes = []
global.notFoundRoute = null

export const addRoute = function(path, options, func) {
  if (path === null) {
    global.notFoundRoute = {
      ...options,
      func
    }
  } else {
    global.allRoutes.push({
      ...options,
      path,
      func,
      regex: pathToRegexp(path),
      match: matcher()(path)
    })
  }
}

export const getRoutes = function() {
  return global.allRoutes
}

export const getNotFoundRoute = function() {
  return global.notFoundRoute
}

export const getRoute = function(path) {
  for (const route of global.allRoutes) {
    if (!route.regex.test(path)) continue
    return route
  }
}
