import {getRoute, getNotFoundRoute} from '../routes'
import {parse} from 'url'
import {send, text, json} from 'micro'
import getViewer from './getViewer'
import onError from './onError'
import cors from './cors'
import connect from '../../database/connect'
import hasMongoURL from '../../database/hasMongoURL'

export default async function (request, response) {
  if (hasMongoURL) {
    await connect()
  }

  const {pathname, query} = parse(request.url, true)
  let route = getRoute(pathname) || getNotFoundRoute()
  if (!route) {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  const params = route.match ? route.match(pathname) : {}

  const funcParams = {
    params,
    query,
    pathname,
    request,
    headers: request.headers,
    response,
    getBody: async () => await text(request),
    getBodyJSON: async () => await json(request)
  }

  cors(funcParams)
  if (request.method === 'OPTIONS') {
    return {}
  }

  try {
    funcParams.viewer = await getViewer(funcParams)
    return await route.func(funcParams)
  } catch (error) {
    onError({error, send, response})
  }
}
