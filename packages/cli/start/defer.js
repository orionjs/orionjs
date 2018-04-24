import onExit from '../helpers/onExit'

export default function(func, time) {
  let callbacks = []
  let timeout = null

  onExit(() => {
    if (timeout) {
      clearTimeout(timeout)
    }
  })

  const runFunction = async function(...args) {
    const result = await func(...args)
    for (const callback of callbacks) {
      callback(result)
    }
    callbacks = []
  }

  return async function(...args) {
    return new Promise(function(resolve) {
      callbacks.push(resolve)

      if (timeout) {
        clearTimeout(timeout)
      }

      timeout = setTimeout(async () => {
        await runFunction(...args)
      }, time)
    })
  }
}
