import config from '../config'
import {PublishOptions} from '../options'
import serialize from './serialize'

/**
 * Publish
 */
export default async function (options: PublishOptions) {
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
        key: 'pink_floyd',
        value: serialize(payload)
      }
    ]
  })
}
