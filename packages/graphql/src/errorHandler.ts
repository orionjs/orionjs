import crypto from 'crypto'
import {UserError} from '@orion-js/helpers'
import {GraphQLError, GraphQLErrorOptions, GraphQLFormattedError} from 'graphql'

export default function errorHandler(error, data) {
  const message = `Error in resolver "${data.name}" ${
    data.model ? `of model "${data.model.name}"` : ''
  }`

  const hash = crypto
    .createHash('sha1')
    .update(error.message, 'utf8')
    .digest('hex')
    .substring(0, 10)
  error.hash = hash

  if (error && error.isOrionError) {
    console.warn(message, error)
    throw new GraphQLError(error.message, {
      originalError: error,
      extensions: {
        isOrionError: !!error.isOrionError,
        isValidationError: !!error.isValidationError,
        code: error.code,
        hash,
        info: error.getInfo()
      }
    })
  } else {
    console.error(message, error)
    throw new GraphQLError(`${error.message} [${hash}]`, {
      // originalError: error,
      extensions: {
        isOrionError: false,
        isValidationError: false,
        code: 'INTERNAL_SERVER_ERROR',
        hash: hash
      }
    })
  }
}
