import {config, UserError} from '@orion-js/app'
import crypto from 'crypto'

export default function errorHandler(error, data) {
  const {logger} = config()
  const message = `Error in resolver "${data.name}" ${
    data.model ? `of model "${data.model.name}"` : ''
  }`
  if (error && error.isOrionError) {
    logger.warn(message, error)
  } else {
    const hash = crypto
      .createHash('sha1')
      .update(error.message, 'utf8')
      .digest('hex')
      .substring(0, 10)
    error.hash = hash
    logger.error(message, error)
    throw new UserError('INTERNAL_SERVER_ERROR', 'unexpected server error', {hash})
  }
}
