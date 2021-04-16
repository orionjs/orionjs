import exitHook from 'async-exit-hook'
import config from '../config'

const callbacks = []

export const setOnExit = function (callback) {
  callbacks.push(callback)
  return callback
}

export const clearOnExit = function (callback) {
  const index = callbacks.indexOf(callback)
  if (index === -1) return
  callbacks.splice(index, 1)
}

exitHook(async onReady => {
  try {
    require('inspector').close()
  } catch (error) {}
  await Promise.all(
    callbacks.map(async callback => {
      try {
        await callback()
      } catch (error) {
        const {logger} = config()
        logger.error('Error on exit callback:', error)
      }
    })
  )
  onReady()
})
