import config from '../config'
import serialize from './serialize'

/**
 * Publish
 * @param  {ID} topic
 * @param  {Object} params
 */
export default async function (options) {
  if (!config.producer) {
    throw new Error('You must initialize echoes configuration to use publish')
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
        value: serialize(payload)
      }
    ]
  })
}
