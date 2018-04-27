import {getRoute} from './routes'
import {parse} from 'url'
import {send} from 'micro'

export default async function(request, response) {
  const {pathname, query} = parse(request.url, true)
  const route = getRoute(pathname)
  if (!route) return 'Not found'

  const params = route.match(pathname)

  const viewer = {}
  const funcParams = {
    viewer,
    params,
    query,
    pathname,
    request,
    response
  }
  try {
    return await route.func(funcParams)
  } catch (error) {
    if (error.isOrionError) {
      const statusCode = 400
      const data = error.getInfo()
      send(response, statusCode, data)
    } else if (error.isGraphQLError) {
      send(response, error.statusCode, error.message)
    } else {
      const statusCode = 500
      const data = {error: 500, message: 'Internal server error'}

      console.error('Unhandled error in route')
      console.error(error)
      send(response, statusCode, data)
    }
  }
}
