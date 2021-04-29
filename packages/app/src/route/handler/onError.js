import config from '../../config'
import crypto from 'crypto'

export default function ({error, send, response, request}) {
  const {logger} = config()
  if (error.isOrionError) {
    let statusCode = 400
    if (error.code === 'AuthError') {
      statusCode = 401
    }
    const data = error.getInfo()
    send(response, statusCode, data)
    logger.warn(`[route/handler] OrionError in ${request.url}:`, error)
  } else if (error.isGraphQLError) {
    send(response, error.statusCode, error.message)
    logger.warn(`[route/handler] GraphQLError in ${request.url}:`, error)
  } else {
    const hash = crypto
      .createHash('sha1')
      .update(error.message, 'utf8')
      .digest('hex')
      .substring(0, 10)
    const statusCode = 500
    const data = {error: 500, message: 'Internal server error', hash}
    send(response, statusCode, data)
    error.hash = hash
    logger.error(`[route/handler] Internal server error in ${request.url}:`, error)
  }
}
