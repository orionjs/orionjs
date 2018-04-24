import {getRoute} from './routes'
import {parse} from 'url'

export default async function(request, response) {
  const {searchParams, pathname} = parse(request.url)
  const route = getRoute(pathname)
  if (!route) return 'Not found'

  const params = route.match(pathname)

  return await route.run({
    params,
    searchParams,
    pathname
  })
}
