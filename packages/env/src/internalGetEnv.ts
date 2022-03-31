import {env} from '.'

export const internalGetEnv = (orionEnvName: string, processEnvName: string): string | null => {
  if (env[orionEnvName]) {
    return env[orionEnvName]
  }

  if (process.env[processEnvName]) {
    return process.env[processEnvName]
  }

  return null
}
