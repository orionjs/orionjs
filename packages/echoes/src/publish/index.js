import config from '../config'
import serialize from './serialize'

/**
 * Publish
 * @param  {ID} topic
 * @param  {Object} params
 * @param  {ID} replyTo
 * @param  {ID} requestId
 */
export default async function (options) {
  const payload = {
    params: options.params
  }

  if (options.replyTo) {
    payload.replyTo = options.replyTo
    payload.requestId = options.requestId
  }

  return await config.producer.send({
    topic: options.topic,
    messages: [
      {
        key: 'pink_floyd',
        value: serialize(payload)
      }
    ]
  })
}
