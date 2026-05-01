import {CronExpressionParser} from 'cron-parser'

export type Options = {
  getNextRun?: () => Date
  runIn?: number
  runEvery?: number
  runAt?: Date
  cron?: string
  timezone?: string
  currentDate?: Date | string | number
} & {[key: string]: any}

export const getNextRunDate = (options: Options) => {
  if (options.runIn) {
    return new Date(Date.now() + options.runIn)
  }

  if (options.runEvery) {
    return new Date(Date.now() + options.runEvery)
  }

  if (options.cron) {
    if (!options.timezone) {
      throw new Error('Cron recurrent jobs require a timezone')
    }

    return CronExpressionParser.parse(options.cron, {
      currentDate: options.currentDate ?? new Date(),
      tz: options.timezone,
    })
      .next()
      .toDate()
  }

  if (options.runAt) {
    return options.runAt
  }

  if (options.getNextRun) {
    return options.getNextRun()
  }

  return new Date()
}
