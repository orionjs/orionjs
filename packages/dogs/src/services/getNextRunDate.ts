export interface Options {
  getNextRun?: () => Date
  runIn?: number
  runAt?: Date
}

export const getNextRunDate = (options: Options) => {
  if (options.runIn) {
    return new Date(Date.now() + options.runIn)
  }

  if (options.runAt) {
    return options.runAt
  }

  return options.getNextRun()
}
