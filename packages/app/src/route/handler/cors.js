// Code based on https://github.com/possibilities/micro-cors
import {getCorsOptions} from '../corsOptions'

export default ({request, response}) => {
  const {maxAge, origin, allowHeaders, exposeHeaders, allowMethods} = getCorsOptions()

  if (!origin) return

  response.setHeader('Access-Control-Max-Age', '' + maxAge)

  response.setHeader('Access-Control-Allow-Origin', origin)

  response.setHeader('Access-Control-Allow-Methods', allowMethods.join(','))

  response.setHeader('Access-Control-Allow-Headers', allowHeaders.join(','))

  if (exposeHeaders && exposeHeaders.length) {
    response.setHeader('Access-Control-Expose-Headers', exposeHeaders.join(','))
  }

  response.setHeader('Access-Control-Allow-Credentials', 'true')
}
