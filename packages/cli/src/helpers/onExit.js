const callbacks = []

export default function(callback) {
  callbacks.push(callback)
}

const onExit = function(...args) {
  for (const callback of callbacks) {
    callback(...args)
  }
  process.exit()
}

// catches ctrl+c event
process.on('SIGINT', onExit)
process.on('SIGTERM', onExit)

// catches terminal close
process.on('SIGHUP', onExit)

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', onExit)
process.on('SIGUSR2', onExit)

// catches uncaught exceptions
process.on('uncaughtException', onExit)
