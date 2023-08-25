import config from '../config'
import {PublishOptions} from '../types'
import serialize from './serialize'

/**
 * Publish
 */
export default async function publish<TParams = any>(options: PublishOptions<TParams>) {
  if (!config.producer) {
    throw new Error('You must initialize echoes configruation to use publish')
  }

  const payload = {
    params: options.params
  }

  return await config.producer.send({
    acks: options.acks,
    timeout: options.timeout,
    topic: options.topic,
    messages: [
      {
        key: 'pink_floyd', // TODO: Remove this in the next release. Kept only to prevent downtime.
        value: serialize(payload)
      }
    ]
  })
}
