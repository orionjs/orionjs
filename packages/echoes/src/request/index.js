import publish from '../publish'
import config from '../config'
import uniqueId from 'lodash/uniqueId'

export default async function (options) {
  const requestId = uniqueId()

  await publish({
    ...options,
    replyTo: `reply_${config.serverId}`,
    requestId
  })

  const promiseEvents = {}

  const timeout = setTimeout(
    () => promiseEvents.reject(new Error('Timeout')),
    options.timeout || 60000
  )

  const clear = () => {
    config.promiseMap.delete(requestId)
    clearTimeout(timeout)
  }

  const promise = new Promise((res, rej) => {
    promiseEvents.resolve = (...args) => {
      clear()
      res(...args)
    }
    promiseEvents.reject = (...args) => {
      clear()
      rej(...args)
    }
  })

  config.promiseMap.set(requestId, promiseEvents)

  return promise
}
