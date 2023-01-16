import crypto from 'crypto'
import {UserError} from '@orion-js/helpers'
import {GraphQLError, GraphQLErrorOptions, GraphQLFormattedError} from 'graphql'

export default function errorHandler(error, data) {
  const message = `Error in resolver "${data.name}" ${
    data.model ? `of model "${data.model.name}"` : ''
  }`
  if (error && error.isOrionError) {
    console.warn(message, error)
    throw new GraphQLError(error.message, {
      originalError: error,
      extensions: {
        isOrionError: !!error.isOrionError,
        isValidationError: !!error.isValidationError,
        code: error.code,
        info: error.getInfo()
      }
    })
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
