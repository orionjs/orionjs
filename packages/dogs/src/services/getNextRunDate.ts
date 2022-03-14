export interface Options {
  getNextRun?: () => Date
  runIn?: number
  runEvery?: number
  runAt?: Date
}

export const getNextRunDate = (options: Options) => {
  if (options.runIn) {
    return new Date(Date.now() + options.runIn)
  }

  if (options.runEvery) {
    return new Date(Date.now() + options.runEvery)
  }

  if (options.runAt) {
    return options.runAt
  }

  if (options.getNextRun) {
    return options.getNextRun()
  }

  return new Date()
}
