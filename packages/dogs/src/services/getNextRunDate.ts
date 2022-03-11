export const getNextRunDate = (options: {getNextRun: () => Date; runEvery: number}) => {
  if (options.runEvery) {
    return new Date(Date.now() + options.runEvery)
  }

  return options.getNextRun()
}
