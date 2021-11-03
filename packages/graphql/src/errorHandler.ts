import crypto from 'crypto'
import {UserError} from '@orion-js/helpers'

export default function errorHandler(error, data) {
  const message = `Error in resolver "${data.name}" ${
    data.model ? `of model "${data.model.name}"` : ''
  }`
  if (error && error.isOrionError) {
    console.warn(message, error)
  } else {
    const hash = crypto
      .createHash('sha1')
      .update(error.message, 'utf8')
      .digest('hex')
      .substring(0, 10)
    error.hash = hash
    console.error(message, error)
    throw new UserError('INTERNAL_SERVER_ERROR', 'Internal server error', {hash})
  }
}
