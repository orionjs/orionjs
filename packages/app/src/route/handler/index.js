import {getRoute} from '../routes'
import {parse} from 'url'
import {send, text, json} from 'micro'
import getViewer from './getViewer'
import onError from './onError'
import cors from './cors'
import connect from '../../database/connect'

export default async function(request, response) {
  await connect()

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
      getBody: async () => await text(request),
      getBodyJSON: async () => await json(request)
    }

    cors(funcParams)
    if (request.method === 'OPTIONS') {
      return {}
    }

    funcParams.viewer = await getViewer(funcParams)
    return await route.func(funcParams)
  } catch (error) {
    onError({error, send, response})
  }
}
