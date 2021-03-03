import {config, UserError} from '@orion-js/app'

export default function errorHandler(error, data) {
  const {logger} = config()
  const message = `Error in resolver "${data.name}" ${
    data.model ? `of model "${data.model.name}"` : ''
  }`
  if (error && error.isOrionError) {
    logger.warn(message, error)
  } else {
    logger.error(message, error)
    throw new UserError('SERVER_ERROR', 'unexpected server error')
  }
}
