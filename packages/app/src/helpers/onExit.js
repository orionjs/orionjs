import exitHook from 'async-exit-hook'

const callbacks = []

export const setOnExit = function(callback) {
  callbacks.push(callback)
}

export const clearOnExit = function(callback) {
  const index = callbacks.indexOf(callback)
  if (index === -1) return
  callbacks.splice(index, 1)
}

exitHook(async onReady => {
  await Promise.all(
    callbacks.map(async callback => {
      try {
        await callback()
      } catch (error) {
        console.error('Error on exit callback:', error)
      }
    })
  )
  try {
    require('inspector').close()
  } catch (error) {}
  onReady()
})
