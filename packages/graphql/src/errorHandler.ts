import crypto from 'node:crypto'
import {GraphQLError} from 'graphql'

export default function errorHandler(error, data) {
  const message = `Error in resolver "${data.name}" ${
    data.schema ? `of model "${data.schema.__modelName}"` : ''
  }`

  const hash = crypto
    .createHash('sha1')
    .update(error.message, 'utf8')
    .digest('hex')
    .substring(0, 10)
  error.hash = hash

  if (error?.isOrionError) {
    console.warn(message, error)
    throw new GraphQLError(error.message, {
      originalError: error,
      extensions: {
        isOrionError: !!error.isOrionError,
        isValidationError: !!error.isValidationError,
        code: error.code,
        hash,
        info: error.getInfo(),
      },
    })
  }
  console.error(message, error)
  throw new GraphQLError(`${error.message} [${hash}]`, {
    // originalError: error,
    extensions: {
      isOrionError: false,
      isValidationError: false,
      code: 'INTERNAL_SERVER_ERROR',
      hash: hash,
    },
  })
}
