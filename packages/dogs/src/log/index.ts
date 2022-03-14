import {LogLevels} from '../types/StartConfig'

export let appLogLevel: LogLevels = 'info'

export const levelToInt = (level: LogLevels) => {
  switch (level) {
    case 'debug':
      return 0
    case 'info':
      return 1
    case 'warn':
      return 2
    case 'error':
      return 3
  }
}

export const log = (level: LogLevels, ...args: any[]) => {
  if (appLogLevel === 'none') return

  const levelInt = levelToInt(level)
  const appLogLevelInt = levelToInt(appLogLevel)

  if (levelInt < appLogLevelInt) return

  console[level](...args)
}

export const setLogLevel = (level: LogLevels) => {
  appLogLevel = level
}
