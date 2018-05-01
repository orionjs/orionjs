import {getRoute} from './routes'
import {parse} from 'url'
import {send, text} from 'micro'
import getViewer from './getViewer'

export default async function(request, response) {
  const {pathname, query} = parse(request.url, true)
  const route = getRoute(pathname)
  if (!route) return 'Not found'

  const params = route.match(pathname)

  try {
    const funcParams = {
      params,
      query,
      pathname,
      request,
      headers: request.headers,
      response,
      getBody: async () => await text(request)
    }
    funcParams.viewer = await getViewer(funcParams)
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
