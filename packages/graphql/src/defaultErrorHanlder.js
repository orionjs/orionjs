import {config} from '@orion-js/app'

export default function defaultErrorHandler(error, data) {
  const {logger} = config()
  if (error && error.getInfo) {
    const info = error.getInfo()
    logger.warn(info.message, error)
  } else {
    logger.error(
      `Error in resolver "${data.name}" ${data.model ? `of model ${data.model.name}` : ''}`,
      error
    )
  }
}
