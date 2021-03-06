import config from '../config'
import serialize from './serialize'

/**
 * Publish
 * @param  {ID} topic
 * @param  {Object} params
 */
export default async function (options) {
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
