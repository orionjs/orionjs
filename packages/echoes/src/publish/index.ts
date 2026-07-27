import config from '../config'
import {PublishOptions} from '../types'

/**
 * Publish
 */
export default async function publish<TParams = any>(options: PublishOptions<TParams>) {
  if (!config.eventBus) {
    throw new Error('You must initialize echoes configuration to use publish')
  }

  return await config.eventBus.publish(options)
}
